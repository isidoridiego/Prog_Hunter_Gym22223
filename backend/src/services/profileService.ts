import { RowDataPacket } from 'mysql2/promise';
import { execute, pool, query } from '../db';
import { getMonarchTitle, MonarchClass, RANKS, rankForXp } from '../gameConfig';

// Profilo completo: XP, rango, statistiche (quest + bonus rango) e catalogo degli item.
export async function getProfile(userId: number) {
  const rows = await query<RowDataPacket>(
    pool,
    `SELECT u.id,u.email,u.username,u.is_admin,u.created_at,a.total_xp,a.str AS quest_str,
      a.vit AS quest_vit,a.agi AS quest_agi,a.monarch_class,ei.item_id,
      i.name AS equipped_item,i.str_percent,i.vit_percent,i.agi_percent
     FROM users u JOIN avatars a ON a.user_id=u.id
     LEFT JOIN equipped_items ei ON ei.user_id=u.id LEFT JOIN items i ON i.id=ei.item_id
     WHERE u.id=?`,
    [userId],
  );
  if (!rows.length) return null;
  const row = rows[0],
    progress = rankForXp(Number(row.total_xp));
  const items = await query<RowDataPacket>(pool, 'SELECT * FROM items ORDER BY id');
  return {
    ...row,
    id: Number(row.id),
    is_admin: Boolean(row.is_admin),
    ...progress,
    monarchTitle: row.monarch_class ? getMonarchTitle(row.monarch_class as MonarchClass) : null,
    stats: {
      STR: Number(row.quest_str) + progress.rankBonus,
      VIT: Number(row.quest_vit) + progress.rankBonus,
      AGI: Number(row.quest_agi) + progress.rankBonus,
    },
    questPoints: { STR: Number(row.quest_str), VIT: Number(row.quest_vit), AGI: Number(row.quest_agi) },
    items: items.map((item) => ({
      id: Number(item['id']),
      name: String(item['name']),
      unlock_rank: String(item['unlock_rank']),
      str_percent: Number(item['str_percent']),
      vit_percent: Number(item['vit_percent']),
      agi_percent: Number(item['agi_percent']),
      unlocked: progress.rankIndex >= RANKS.findIndex((rank) => rank.name === item['unlock_rank']),
      equipped: Number(row.item_id) === Number(item['id']),
    })),
  };
}

// Equipaggia un item, solo se il rango dell'utente lo ha sbloccato.
export async function equipItem(userId: number, itemId: number) {
  const profile = await getProfile(userId);
  if (!profile) return { kind: 'not_found' as const };
  const item = profile.items.find((entry) => Number(entry.id) === itemId);
  if (!item) return { kind: 'invalid_item' as const };
  if (!item.unlocked) return { kind: 'locked' as const };
  await execute(
    pool,
    `INSERT INTO equipped_items(user_id,item_id) VALUES(?,?)
    ON DUPLICATE KEY UPDATE item_id=VALUES(item_id)`,
    [userId, itemId],
  );
  return { kind: 'saved' as const, data: await getProfile(userId) };
}

// Salva la classe Monarca: serve il rango Monarca e la scelta si può fare una sola volta.
export async function setMonarchClass(userId: number, monarchClass: string) {
  return pool.getConnection().then(async (connection) => {
    try {
      await connection.beginTransaction();
      const rows = await query<RowDataPacket>(
        connection,
        'SELECT total_xp,monarch_class FROM avatars WHERE user_id=? FOR UPDATE',
        [userId],
      );
      if (!rows.length) {
        await connection.rollback();
        return { kind: 'not_found' as const };
      }
      if (Number(rows[0].total_xp) < 33000) {
        await connection.rollback();
        return { kind: 'not_monarch' as const };
      }
      if (rows[0].monarch_class) {
        await connection.rollback();
        return { kind: 'already_chosen' as const };
      }
      await execute(connection, 'UPDATE avatars SET monarch_class=? WHERE user_id=?', [monarchClass, userId]);
      await connection.commit();
      return { kind: 'saved' as const };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
}

// Hash della password attuale (serve per controllare il cambio password).
export async function getPasswordHash(userId: number) {
  const rows = await query<RowDataPacket>(pool, 'SELECT password_hash FROM users WHERE id=?', [userId]);
  return rows[0]?.password_hash ?? null;
}
// Salva il nuovo hash della password.
export async function updatePassword(userId: number, passwordHash: string) {
  const result = await execute(pool, 'UPDATE users SET password_hash=? WHERE id=?', [passwordHash, userId]);
  return result.affectedRows === 1;
}

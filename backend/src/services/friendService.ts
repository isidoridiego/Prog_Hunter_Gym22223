import { RowDataPacket } from 'mysql2/promise';
import { execute, pool, query, withTransaction } from '../db';
import { getMonarchTitle, MonarchClass, rankForXp } from '../gameConfig';

// Cerca utenti per username e indica che rapporto hanno con chi cerca.
export async function searchUsers(userId: number, username: string) {
  const rows = await query<RowDataPacket>(
    pool,
    `SELECT u.id, u.username, a.total_xp, a.monarch_class,
       CASE
         WHEN f.id IS NULL THEN 'none'
         WHEN f.status = 'accepted' THEN 'accepted'
         WHEN f.status = 'rejected' THEN 'rejected'
         WHEN f.requester_id = ? THEN 'request_sent'
         ELSE 'request_received'
       END AS relationship
     FROM users AS u
     JOIN avatars AS a ON a.user_id = u.id
     LEFT JOIN friendships AS f
       ON f.pair_low = LEAST(u.id, ?) AND f.pair_high = GREATEST(u.id, ?)
     WHERE u.id <> ? AND u.username LIKE CONCAT('%', ?, '%')
     ORDER BY u.username LIMIT 25`,
    [userId, userId, userId, userId, username],
  );
  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    rank: rankForXp(Number(row.total_xp)).rank,
    monarch_title: row.monarch_class ? getMonarchTitle(row.monarch_class as MonarchClass) : null,
  }));
}

function formatHunter(row: RowDataPacket) {
  const progress = rankForXp(Number(row.total_xp));
  return {
    ...row,
    id: Number(row.id),
    rank: progress.rank,
    monarch_title: row.monarch_class ? getMonarchTitle(row.monarch_class as MonarchClass) : null,
    str: row.str === undefined ? undefined : Number(row.str) + progress.rankBonus,
    vit: row.vit === undefined ? undefined : Number(row.vit) + progress.rankBonus,
    agi: row.agi === undefined ? undefined : Number(row.agi) + progress.rankBonus,
  };
}

// Amici accettati con XP, rango e statistiche.
export async function listFriends(userId: number) {
  const rows = await query<RowDataPacket>(
    pool,
    `SELECT u.id, u.username, a.total_xp, a.monarch_class, a.str, a.vit, a.agi,
       f.created_at AS friends_since
     FROM friendships AS f
     JOIN users AS u ON u.id = CASE
       WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
     JOIN avatars AS a ON a.user_id = u.id
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
     ORDER BY a.total_xp DESC, u.username`,
    [userId, userId, userId],
  );
  return rows.map(formatHunter);
}

// Classifica per XP totali di te e dei tuoi amici.
export async function getLeaderboard(userId: number) {
  const rows = await query<RowDataPacket>(
    pool,
    `SELECT u.id, u.username, a.total_xp, a.monarch_class, a.str, a.vit, a.agi,
       (u.id = ?) AS is_self,
       ROW_NUMBER() OVER (ORDER BY a.total_xp DESC, u.username ASC) AS leaderboard_position
     FROM users AS u
     JOIN avatars AS a ON a.user_id = u.id
     WHERE u.id = ? OR EXISTS (
       SELECT 1 FROM friendships AS f WHERE f.status = 'accepted'
         AND ((f.requester_id = ? AND f.addressee_id = u.id)
           OR (f.addressee_id = ? AND f.requester_id = u.id))
     )
     ORDER BY a.total_xp DESC, u.username ASC`,
    [userId, userId, userId, userId],
  );
  return rows.map((row) => ({ ...formatHunter(row), position: Number(row.leaderboard_position) }));
}

// Richieste di amicizia ricevute e inviate.
export async function getFriendRequests(userId: number) {
  const incoming = await query<RowDataPacket>(
    pool,
    `SELECT f.id, f.requester_id AS user_id, u.username, f.status,
       f.created_at, f.responded_at
     FROM friendships AS f JOIN users AS u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status <> 'accepted'
     ORDER BY f.created_at DESC`,
    [userId],
  );
  const outgoing = await query<RowDataPacket>(
    pool,
    `SELECT f.id, f.addressee_id AS user_id, u.username, f.status,
       f.created_at, f.responded_at
     FROM friendships AS f JOIN users AS u ON u.id = f.addressee_id
     WHERE f.requester_id = ? AND f.status <> 'accepted'
     ORDER BY f.created_at DESC`,
    [userId],
  );
  return {
    incoming: incoming.map((row) => ({
      ...row,
      id: Number(row.id),
      user_id: Number(row.user_id),
    })),
    outgoing: outgoing.map((row) => ({
      ...row,
      id: Number(row.id),
      user_id: Number(row.user_id),
    })),
  };
}

// Invia una richiesta di amicizia, evitando duplicati e richieste incrociate.
export async function createFriendRequest(userId: number, targetId: number) {
  return withTransaction(async (connection) => {
    if (userId === targetId) return { kind: 'self' as const };
    const ids = [userId, targetId].sort((a, b) => a - b);
    const locked = await query<RowDataPacket>(
      connection,
      'SELECT id FROM users WHERE id IN (?) ORDER BY id FOR UPDATE',
      [ids],
    );
    if (locked.length !== 2) return { kind: 'user_missing' as const };

    const existing = await query<RowDataPacket>(
      connection,
      `SELECT status, requester_id FROM friendships
       WHERE pair_low = ? AND pair_high = ?`,
      [ids[0], ids[1]],
    );
    if (existing.length) {
      const row = existing[0];
      if (row.status === 'accepted') return { kind: 'already_friends' as const };
      if (row.status === 'pending' && Number(row.requester_id) !== userId) {
        return { kind: 'incoming_request' as const };
      }
      return { kind: 'request_exists' as const };
    }

    const inserted = await execute(
      connection,
      `INSERT INTO friendships
       (requester_id, addressee_id, pair_low, pair_high)
       VALUES(?, ?, ?, ?)`,
      [userId, targetId, ids[0], ids[1]],
    );
    const rows = await query<RowDataPacket>(
      connection,
      `SELECT id, requester_id, addressee_id, status, created_at
       FROM friendships WHERE id = ?`,
      [inserted.insertId],
    );
    const row = rows[0];
    return {
      kind: 'created' as const,
      data: {
        ...row,
        id: Number(row.id),
        requester_id: Number(row.requester_id),
        addressee_id: Number(row.addressee_id),
      },
    };
  });
}

async function respondToRequest(userId: number, requestId: number, status: 'accepted' | 'rejected') {
  return withTransaction(async (connection) => {
    const updated = await execute(
      connection,
      `UPDATE friendships SET status = ?, responded_at = UTC_TIMESTAMP()
       WHERE id = ? AND addressee_id = ? AND status = 'pending'`,
      [status, requestId, userId],
    );
    if (updated.affectedRows) {
      const rows = await query<RowDataPacket>(
        connection,
        `SELECT id, requester_id, addressee_id, status, created_at, responded_at
         FROM friendships WHERE id = ?`,
        [requestId],
      );
      const row = rows[0];
      return {
        kind: 'updated' as const,
        data: {
          ...row,
          id: Number(row.id),
          requester_id: Number(row.requester_id),
          addressee_id: Number(row.addressee_id),
        },
      };
    }

    const existing = await query<RowDataPacket>(
      connection,
      'SELECT status FROM friendships WHERE id = ? AND addressee_id = ?',
      [requestId, userId],
    );
    if (!existing.length) return { kind: 'not_found' as const };
    return { kind: 'not_pending' as const, status: existing[0].status };
  });
}

// Accetta una richiesta ricevuta.
export async function acceptFriendRequest(userId: number, requestId: number) {
  return respondToRequest(userId, requestId, 'accepted');
}

// Rifiuta una richiesta ricevuta.
export async function rejectFriendRequest(userId: number, requestId: number) {
  return respondToRequest(userId, requestId, 'rejected');
}

// Elimina l'amicizia tra due utenti.
export async function removeFriend(userId: number, otherUserId: number) {
  if (userId === otherUserId) return { kind: 'invalid' as const };
  const result = await execute(
    pool,
    `DELETE FROM friendships WHERE status = 'accepted'
     AND ((requester_id = ? AND addressee_id = ?)
       OR (requester_id = ? AND addressee_id = ?))`,
    [userId, otherUserId, otherUserId, userId],
  );
  return result.affectedRows ? { kind: 'removed' as const } : { kind: 'not_found' as const };
}

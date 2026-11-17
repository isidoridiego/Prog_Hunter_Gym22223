import { RowDataPacket } from 'mysql2/promise';
import { execute, pool, query, withTransaction } from '../db';

export type AdminRewardGrant = { xp: number; str: number; vit: number; agi: number };

const MAX_TOTAL_XP = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_STAT_POINTS = 4_294_967_295;

// Aggiunge XP e punti statistica all'account admin (usato per provare i ranghi).
export async function grantSelfRewards(userId: number, grant: AdminRewardGrant) {
  return withTransaction(async (connection) => {
    const rows = await query<RowDataPacket>(
      connection,
      'SELECT total_xp,str,vit,agi FROM avatars WHERE user_id=? FOR UPDATE',
      [userId],
    );
    if (!rows.length) return { kind: 'not_found' as const };

    const currentXp = BigInt(String(rows[0].total_xp));
    const nextXp = currentXp + BigInt(grant.xp) > MAX_TOTAL_XP ? MAX_TOTAL_XP : currentXp + BigInt(grant.xp);
    const currentStats = {
      str: Number(rows[0].str),
      vit: Number(rows[0].vit),
      agi: Number(rows[0].agi),
    };
    const nextStats = {
      str: Math.min(MAX_STAT_POINTS, currentStats.str + grant.str),
      vit: Math.min(MAX_STAT_POINTS, currentStats.vit + grant.vit),
      agi: Math.min(MAX_STAT_POINTS, currentStats.agi + grant.agi),
    };

    await execute(connection, 'UPDATE avatars SET total_xp=?,str=?,vit=?,agi=? WHERE user_id=?', [
      nextXp.toString(),
      nextStats.str,
      nextStats.vit,
      nextStats.agi,
      userId,
    ]);

    return {
      kind: 'granted' as const,
      granted: {
        xp: Number(nextXp - currentXp),
        str: nextStats.str - currentStats.str,
        vit: nextStats.vit - currentStats.vit,
        agi: nextStats.agi - currentStats.agi,
      },
    };
  });
}

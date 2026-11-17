import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { execute, pool, query, withTransaction } from '../db';
import {
  calculateBattleDamage,
  challengerAttacksFirst,
  getBattleAttackPower,
  getBattleDodgeChance,
  getBattleMaxHp,
  getBattleWinner,
  isBattleAttackDodged,
  BATTLE_MAX_TURNS,
  MAX_DAILY_BATTLES,
  rankForXp,
} from '../gameConfig';

type Fighter = {
  id: number;
  username: string;
  totalXp: number;
  rank: string;
  monarchClass: string | null;
  itemName: string | null;
  str: number;
  vit: number;
  agi: number;
  maxHp: number;
  attackPower: number;
  dodgeChance: number;
};

type Turn = {
  turn: number;
  attackerId: number;
  attackerUsername: string;
  defenderId: number;
  defenderUsername: string;
  dodged: boolean;
  damage: number;
  defenderHp: number;
};

const BATTLE_SELECT = `SELECT b.id, b.challenger_id, cu.username AS challenger_username,
  b.opponent_id, ou.username AS opponent_username, b.winner_id,
  wu.username AS winner_username, b.challenger_stats, b.opponent_stats,
  b.turn_log, b.created_at
  FROM battles AS b
  JOIN users AS cu ON cu.id = b.challenger_id
  JOIN users AS ou ON ou.id = b.opponent_id
  LEFT JOIN users AS wu ON wu.id = b.winner_id`;

// Per l'elenco serve solo un riassunto: il registro dei turni si scarica aprendo la singola battaglia.
const BATTLE_LIST_SELECT = `SELECT b.id, b.challenger_id, cu.username AS challenger_username,
  b.opponent_id, ou.username AS opponent_username, b.winner_id,
  wu.username AS winner_username, JSON_LENGTH(b.turn_log) AS turns, b.created_at
  FROM battles AS b
  JOIN users AS cu ON cu.id = b.challenger_id
  JOIN users AS ou ON ou.id = b.opponent_id
  LEFT JOIN users AS wu ON wu.id = b.winner_id`;

// Calcola le statistiche di combattimento: punti quest + bonus rango, poi la percentuale dell'item.
function createFighter(row: RowDataPacket): Fighter {
  const progress = rankForXp(Number(row.total_xp));
  const str = Math.floor(
    (Number(row.str) + progress.rankBonus) * (1 + Number(row.item_str_percent ?? 0) / 100),
  );
  const vit = Math.floor(
    (Number(row.vit) + progress.rankBonus) * (1 + Number(row.item_vit_percent ?? 0) / 100),
  );
  const agi = Math.floor(
    (Number(row.agi) + progress.rankBonus) * (1 + Number(row.item_agi_percent ?? 0) / 100),
  );
  return {
    id: Number(row.user_id),
    username: row.username,
    totalXp: Number(row.total_xp),
    rank: progress.rank,
    monarchClass: row.monarch_class,
    itemName: row.item_name,
    str,
    vit,
    agi,
    maxHp: getBattleMaxHp(vit),
    attackPower: getBattleAttackPower(str),
    dodgeChance: getBattleDodgeChance(agi),
  };
}

// Simula lo scontro a turni: attacca per primo chi ha più agilità, poi si alternano.
function simulate(challenger: Fighter, opponent: Fighter) {
  let challengerHp = challenger.maxHp;
  let opponentHp = opponent.maxHp;
  const firstAttacker = challengerAttacksFirst(challenger.agi, opponent.agi) ? challenger : opponent;
  const turnLog: Turn[] = [];

  for (let turn = 1; turn <= BATTLE_MAX_TURNS && challengerHp > 0 && opponentHp > 0; turn += 1) {
    const attacker =
      turn % 2 === 1 ? firstAttacker : firstAttacker.id === challenger.id ? opponent : challenger;
    const defender = attacker.id === challenger.id ? opponent : challenger;
    const dodged = isBattleAttackDodged(Math.random(), defender.dodgeChance);
    let damage = 0;

    if (!dodged) {
      damage = calculateBattleDamage(attacker.attackPower, defender.vit, Math.random());
      if (defender.id === challenger.id) challengerHp = Math.max(0, challengerHp - damage);
      else opponentHp = Math.max(0, opponentHp - damage);
    }

    turnLog.push({
      turn,
      attackerId: attacker.id,
      attackerUsername: attacker.username,
      defenderId: defender.id,
      defenderUsername: defender.username,
      dodged,
      damage,
      defenderHp: defender.id === challenger.id ? challengerHp : opponentHp,
    });
  }

  const winnerId = getBattleWinner(
    challengerHp,
    opponentHp,
    challenger.maxHp,
    opponent.maxHp,
    challenger.id,
    opponent.id,
  );
  return { winnerId, turnLog, challengerHp, opponentHp };
}

// Conta quante battaglie hanno già fatto oggi i cacciatori indicati.
async function battleCounts(connection: PoolConnection, userIds: number[]) {
  const rows = await query<RowDataPacket>(
    connection,
    `SELECT participant_id, COUNT(*) AS used_today
     FROM (
       SELECT challenger_id AS participant_id FROM battles
       WHERE challenger_id IN (?) AND created_at >= UTC_DATE()
         AND created_at < DATE_ADD(UTC_DATE(), INTERVAL 1 DAY)
       UNION ALL
       SELECT opponent_id AS participant_id FROM battles
       WHERE opponent_id IN (?) AND created_at >= UTC_DATE()
         AND created_at < DATE_ADD(UTC_DATE(), INTERVAL 1 DAY)
     ) AS participations GROUP BY participant_id`,
    [userIds, userIds],
  );
  return new Map(rows.map((row) => [Number(row.participant_id), Number(row.used_today)]));
}

// Controlla amicizia e limite giornaliero, simula la battaglia e la salva nello storico.
export async function createBattle(challengerId: number, opponentId: number) {
  return withTransaction(async (connection) => {
    if (challengerId === opponentId) return { kind: 'self' as const };
    const userIds = [challengerId, opponentId].sort((a, b) => a - b);
    const lockedUsers = await query<RowDataPacket>(
      connection,
      'SELECT id FROM users WHERE id IN (?) ORDER BY id FOR UPDATE',
      [userIds],
    );
    if (lockedUsers.length !== 2) return { kind: 'user_missing' as const };

    const friends = await query<RowDataPacket>(
      connection,
      `SELECT id FROM friendships
       WHERE status = 'accepted' AND pair_low = ? AND pair_high = ? FOR UPDATE`,
      [userIds[0], userIds[1]],
    );
    if (!friends.length) return { kind: 'not_friends' as const };

    const counts = await battleCounts(connection, userIds);
    const usedToday = counts.get(challengerId) ?? 0;
    const opponentUsedToday = counts.get(opponentId) ?? 0;
    if (usedToday >= MAX_DAILY_BATTLES || opponentUsedToday >= MAX_DAILY_BATTLES) {
      return {
        kind: 'daily_limit' as const,
        usedToday,
        remainingToday: Math.max(0, MAX_DAILY_BATTLES - usedToday),
      };
    }

    const avatarRows = await query<RowDataPacket>(
      connection,
      `SELECT a.user_id,u.username,a.total_xp,a.str,a.vit,a.agi,a.monarch_class,
         i.name AS item_name,COALESCE(i.str_percent,0) AS item_str_percent,
         COALESCE(i.vit_percent,0) AS item_vit_percent,COALESCE(i.agi_percent,0) AS item_agi_percent
       FROM avatars AS a JOIN users AS u ON u.id = a.user_id
       LEFT JOIN equipped_items ei ON ei.user_id=a.user_id LEFT JOIN items i ON i.id=ei.item_id
       WHERE a.user_id IN (?) ORDER BY a.user_id FOR UPDATE`,
      [userIds],
    );
    if (avatarRows.length !== 2) return { kind: 'avatar_missing' as const };

    const byId = new Map(avatarRows.map((row) => [Number(row.user_id), row]));
    const challenger = createFighter(byId.get(challengerId)!);
    const opponent = createFighter(byId.get(opponentId)!);
    const result = simulate(challenger, opponent);
    if (result.winnerId !== challengerId && result.winnerId !== opponentId) {
      throw new Error('Il vincitore della battaglia non è uno dei partecipanti.');
    }
    const inserted = await execute(
      connection,
      `INSERT INTO battles
       (challenger_id, opponent_id, winner_id, challenger_stats, opponent_stats, turn_log)
       VALUES(?, ?, ?, ?, ?, ?)`,
      [
        challengerId,
        opponentId,
        result.winnerId,
        JSON.stringify(challenger),
        JSON.stringify(opponent),
        JSON.stringify(result.turnLog),
      ],
    );
    const battles = await query<RowDataPacket>(connection, 'SELECT created_at FROM battles WHERE id = ?', [
      inserted.insertId,
    ]);
    const usedAfter = usedToday + 1;

    return {
      kind: 'created' as const,
      data: {
        battle: {
          id: inserted.insertId,
          challenger_id: challengerId,
          opponent_id: opponentId,
          winner_id: result.winnerId,
          challenger_stats: challenger,
          opponent_stats: opponent,
          turn_log: result.turnLog,
          created_at: battles[0].created_at,
          final_hp: { challenger: result.challengerHp, opponent: result.opponentHp },
        },
        maxDailyBattles: MAX_DAILY_BATTLES,
        usedToday: usedAfter,
        remainingToday: MAX_DAILY_BATTLES - usedAfter,
      },
    };
  });
}

// Storico delle ultime 50 battaglie dell'utente e sfide rimaste oggi.
export async function listBattles(userId: number) {
  const [battles, counts] = await Promise.all([
    query<RowDataPacket>(
      pool,
      `${BATTLE_LIST_SELECT}
       WHERE b.challenger_id = ? OR b.opponent_id = ?
       ORDER BY b.created_at DESC LIMIT 50`,
      [userId, userId],
    ),
    query<RowDataPacket>(
      pool,
      `SELECT COUNT(*) AS used_today FROM battles
       WHERE (challenger_id = ? OR opponent_id = ?)
         AND created_at >= UTC_DATE()
         AND created_at < DATE_ADD(UTC_DATE(), INTERVAL 1 DAY)`,
      [userId, userId],
    ),
  ]);
  const usedToday = Number(counts[0].used_today);
  const items = battles.map((row) => ({
    ...row,
    id: Number(row.id),
    challenger_id: Number(row.challenger_id),
    opponent_id: Number(row.opponent_id),
    winner_id: row.winner_id === null ? null : Number(row.winner_id),
    turns: Number(row.turns),
  }));
  return {
    items,
    maxDailyBattles: MAX_DAILY_BATTLES,
    usedToday,
    remainingToday: Math.max(0, MAX_DAILY_BATTLES - usedToday),
  };
}

// Dettaglio di una battaglia (con turni): visibile solo ai due partecipanti.
export async function getBattle(userId: number, battleId: number) {
  const rows = await query<RowDataPacket>(
    pool,
    `${BATTLE_SELECT}
     WHERE b.id = ? AND (b.challenger_id = ? OR b.opponent_id = ?)`,
    [battleId, userId, userId],
  );
  const row = rows[0];
  return row
    ? {
        ...row,
        id: Number(row.id),
        challenger_id: Number(row.challenger_id),
        opponent_id: Number(row.opponent_id),
        winner_id: row.winner_id === null ? null : Number(row.winner_id),
      }
    : null;
}

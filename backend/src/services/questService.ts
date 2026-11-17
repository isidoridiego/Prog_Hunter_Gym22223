import { RowDataPacket } from 'mysql2/promise';
import { execute, pool, query, withTransaction } from '../db';
import { QUEST_REWARDS, QuestDifficulty, rankForXp } from '../gameConfig';

const QUEST_FIELDS = `q.id, q.quest_date, q.status, q.completed_at, q.verified_at,
  q.xp_awarded, q.stat_awarded, e.name, e.description, e.objective, e.difficulty, e.stat`;

const DAILY_QUESTS: Record<QuestDifficulty, number> = {
  facile: 3,
  media: 2,
  hard: 1,
};

type QuestRow = RowDataPacket & {
  id: number;
  user_id: number;
  verifier_id: number | null;
  status: string;
  exercise_id: number;
  difficulty: QuestDifficulty;
  stat: string;
};

// Crea le sei quest una volta al giorno e restituisce sempre le stesse assegnazioni.
export async function getTodayQuests(userId: number) {
  return withTransaction(async (connection) => {
    // Il lock evita che due richieste simultanee generino doppie quest.
    const users = await query<RowDataPacket>(connection, 'SELECT id FROM users WHERE id=? FOR UPDATE', [
      userId,
    ]);
    if (!users.length) return null;

    const existingQuests = await query<RowDataPacket>(
      connection,
      'SELECT q.id FROM daily_quests q WHERE q.user_id=? AND q.quest_date=CURDATE() LIMIT 1',
      [userId],
    );

    if (!existingQuests.length) {
      const selectedIds: number[] = [];

      // Pesca il numero richiesto per difficoltà, evitando gli esercizi di ieri.
      for (const difficulty of ['facile', 'media', 'hard'] as QuestDifficulty[]) {
        const candidates = await query<RowDataPacket>(
          connection,
          `SELECT id FROM exercises
           WHERE difficulty=?
             AND id NOT IN (
               SELECT exercise_id FROM daily_quests
               WHERE user_id=? AND quest_date=DATE_SUB(CURDATE(), INTERVAL 1 DAY)
             )
           ORDER BY RAND()
           LIMIT ?`,
          [difficulty, userId, DAILY_QUESTS[difficulty]],
        );

        if (candidates.length !== DAILY_QUESTS[difficulty]) {
          throw new Error(`Pool quest ${difficulty} insufficiente per evitare gli esercizi di ieri.`);
        }

        selectedIds.push(...candidates.map((row) => Number(row.id)));
      }

      // Salva tutte le assegnazioni nella stessa transazione.
      for (const exerciseId of selectedIds) {
        await execute(
          connection,
          'INSERT INTO daily_quests(user_id,quest_date,exercise_id) VALUES(?,CURDATE(),?)',
          [userId, exerciseId],
        );
      }
    }

    return query<RowDataPacket>(
      connection,
      `SELECT ${QUEST_FIELDS}, u.username AS verifier_username
       FROM daily_quests q
       JOIN exercises e ON e.id=q.exercise_id
       LEFT JOIN users u ON u.id=q.verifier_id
       WHERE q.user_id=? AND q.quest_date=CURDATE()
       ORDER BY FIELD(e.difficulty,'facile','media','hard'),
         FIELD(e.stat,'STR','VIT','AGI'), e.name`,
      [userId],
    );
  });
}

// Restituisce le quest dei giorni precedenti per lo storico personale.
export async function getQuestHistory(userId: number) {
  return query<RowDataPacket>(
    pool,
    `SELECT ${QUEST_FIELDS}, u.username AS verifier_username
     FROM daily_quests q
     JOIN exercises e ON e.id=q.exercise_id
     LEFT JOIN users u ON u.id=q.verifier_id
     WHERE q.user_id=? AND q.quest_date<CURDATE()
     ORDER BY q.quest_date DESC, q.id
     LIMIT 300`,
    [userId],
  );
}

// Assegna il premio completo all'atleta e metà degli XP al verificatore.
async function awardQuest(connection: Parameters<Parameters<typeof withTransaction>[0]>[0], quest: QuestRow) {
  const reward = QUEST_REWARDS[quest.difficulty];
  const verifierXp = Math.floor(reward.xp / 2);
  const lockedUserIds = [quest.user_id, quest.verifier_id]
    .filter((id): id is number => id !== null)
    .sort((first, second) => first - second);
  const avatars = await query<RowDataPacket>(
    connection,
    'SELECT user_id,total_xp,str,vit,agi FROM avatars WHERE user_id IN (?) ORDER BY user_id FOR UPDATE',
    [lockedUserIds],
  );
  const athlete = avatars.find((avatar) => Number(avatar.user_id) === quest.user_id);
  if (!athlete) throw new Error('Statistiche utente non trovate.');

  const xpBefore = Number(athlete.total_xp);
  const rankBefore = rankForXp(xpBefore);
  const rankAfter = rankForXp(xpBefore + reward.xp);

  // La quest che porta a Monarca dà XP, ma non aggiunge punti statistica.
  const statReward = rankBefore.rank !== 'Monarca' && rankAfter.rank !== 'Monarca' ? reward.stat : 0;

  const stats = {
    STR: Number(athlete.str),
    VIT: Number(athlete.vit),
    AGI: Number(athlete.agi),
  };
  if (quest.stat === 'STR') stats.STR += statReward;
  if (quest.stat === 'VIT') stats.VIT += statReward;
  if (quest.stat === 'AGI') stats.AGI += statReward;

  // Gli XP continuano anche dopo Monarca; i punti stat invece restano fermi.
  await execute(connection, 'UPDATE avatars SET total_xp=?,str=?,vit=?,agi=? WHERE user_id=?', [
    xpBefore + reward.xp,
    stats.STR,
    stats.VIT,
    stats.AGI,
    quest.user_id,
  ]);

  // L'amico riceve solo metà degli XP e non ottiene punti statistica.
  const verifier = avatars.find((avatar) => Number(avatar.user_id) === quest.verifier_id);
  if (verifier && quest.verifier_id !== quest.user_id) {
    await execute(connection, 'UPDATE avatars SET total_xp=total_xp+? WHERE user_id=?', [
      verifierXp,
      quest.verifier_id,
    ]);
  }

  await execute(
    connection,
    `UPDATE daily_quests
     SET status='verificata', verifier_id=?, verified_at=UTC_TIMESTAMP(),
       xp_awarded=?, stat_awarded=?
     WHERE id=?`,
    [quest.verifier_id, reward.xp, statReward, quest.id],
  );

  return {
    xp: reward.xp,
    stat: statReward,
    verifierXp,
    rank: rankAfter.rank,
    rankUps: rankAfter.crossed,
  };
}

// Invia la quest all'approvazione di un amico; senza amici la quest resta assegnata.
export async function completeQuest(userId: number, questId: number, verifierId?: number) {
  return withTransaction(async (connection) => {
    const quests = await query<QuestRow>(
      connection,
      `SELECT q.id,q.user_id,q.status,q.verifier_id,q.exercise_id,e.difficulty,e.stat
       FROM daily_quests q
       JOIN exercises e ON e.id=q.exercise_id
       WHERE q.id=? AND q.user_id=?
       FOR UPDATE`,
      [questId, userId],
    );
    const quest = quests[0];
    if (!quest) return { kind: 'not_found' as const };
    if (quest.status !== 'assegnata') return { kind: 'already_done' as const };

    const friends = await query<RowDataPacket>(
      connection,
      `SELECT COUNT(*) AS count FROM friendships
       WHERE status='accepted' AND (requester_id=? OR addressee_id=?)`,
      [userId, userId],
    );

    if (Number(friends[0].count) === 0) {
      return { kind: 'no_friends' as const };
    }

    if (!verifierId || verifierId === userId) {
      return { kind: 'verifier_required' as const };
    }

    const friendship = await query<RowDataPacket>(
      connection,
      `SELECT id FROM friendships
       WHERE status='accepted'
         AND pair_low=LEAST(?,?)
         AND pair_high=GREATEST(?,?)`,
      [userId, verifierId, userId, verifierId],
    );
    if (!friendship.length) return { kind: 'not_friends' as const };

    await execute(
      connection,
      `UPDATE daily_quests
       SET status='in_attesa', verifier_id=?, completed_at=UTC_TIMESTAMP()
       WHERE id=?`,
      [verifierId, questId],
    );
    return { kind: 'pending' as const };
  });
}

// Mostra le quest che sono state assegnate a questo verificatore.
export async function listIncomingQuests(verifierId: number) {
  return query<RowDataPacket>(
    pool,
    `SELECT q.id,q.quest_date,q.status,q.completed_at,
       u.id AS requester_id,u.username AS requester_username,
       e.name,e.description,e.objective,e.difficulty,e.stat
     FROM daily_quests q
     JOIN users u ON u.id=q.user_id
     JOIN exercises e ON e.id=q.exercise_id
     WHERE q.verifier_id=? AND q.status='in_attesa'
     ORDER BY q.completed_at`,
    [verifierId],
  );
}

// Mostra all'utente le quest inviate e ancora in attesa di risposta.
export async function listOwnPendingQuests(userId: number) {
  return query<RowDataPacket>(
    pool,
    `SELECT q.id,q.quest_date,q.status,q.completed_at,
       e.name,e.difficulty,e.stat,u.username AS verifier_username
     FROM daily_quests q
     JOIN exercises e ON e.id=q.exercise_id
     LEFT JOIN users u ON u.id=q.verifier_id
     WHERE q.user_id=? AND q.status='in_attesa'
     ORDER BY q.completed_at DESC`,
    [userId],
  );
}

// Accetta o rifiuta una quest inviata da un amico.
export async function verifyQuest(verifierId: number, questId: number, approve: boolean) {
  return withTransaction(async (connection) => {
    const quests = await query<QuestRow>(
      connection,
      `SELECT q.id,q.user_id,q.verifier_id,q.status,q.exercise_id,e.difficulty,e.stat
       FROM daily_quests q
       JOIN exercises e ON e.id=q.exercise_id
       WHERE q.id=?
       FOR UPDATE`,
      [questId],
    );
    const quest = quests[0];
    if (!quest) return { kind: 'not_found' as const };
    if (Number(quest.verifier_id) !== verifierId) return { kind: 'forbidden' as const };
    if (quest.status !== 'in_attesa') return { kind: 'already_done' as const };

    if (!approve) {
      await execute(
        connection,
        `UPDATE daily_quests
         SET status='assegnata', verifier_id=NULL, completed_at=NULL
         WHERE id=?`,
        [questId],
      );
      return { kind: 'rejected' as const };
    }

    return {
      kind: 'verified' as const,
      award: await awardQuest(connection, quest),
    };
  });
}

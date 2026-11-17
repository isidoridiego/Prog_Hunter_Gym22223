import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { execute, pool, query, withTransaction } from '../src/db';
import { RowDataPacket } from 'mysql2/promise';
dotenv.config();

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('HunterGym123!', 10);
  await withTransaction(async (client) => {
    const users = [
      { email: 'alex@example.test', username: 'AlexHunter' },
      { email: 'mira@example.test', username: 'MiraBlade' },
      { email: 'leo@example.test', username: 'LeoRogue' },
    ];
    const ids: number[] = [];
    for (const userData of users) {
      const inserted = await execute(
        client,
        'INSERT IGNORE INTO users(email, username, password_hash) VALUES(?, ?, ?)',
        [userData.email, userData.username, passwordHash],
      );
      if (inserted.affectedRows) {
        const id = inserted.insertId;
        ids.push(id);
        await execute(client, 'INSERT INTO avatars(user_id) VALUES(?)', [id]);
      } else {
        const existing = await query<RowDataPacket>(client, 'SELECT id FROM users WHERE username = ?', [
          userData.username,
        ]);
        ids.push(Number(existing[0].id));
      }
    }
    const [[a, b], [c, d]] = [
      [ids[0], ids[1]],
      [ids[0], ids[2]],
    ];
    await execute(
      client,
      `INSERT IGNORE INTO friendships
       (requester_id, addressee_id, pair_low, pair_high, status, responded_at)
       VALUES (?, ?, ?, ?, 'accepted', NOW()), (?, ?, ?, ?, 'accepted', NOW())`,
      [a, b, Math.min(a, b), Math.max(a, b), c, d, Math.min(c, d), Math.max(c, d)],
    );
  });
  console.log('Seed pronto. Account demo: AlexHunter, MiraBlade, LeoRogue; password: HunterGym123!');
}
seed()
  .catch((error) => {
    console.error('Seed fallito:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });

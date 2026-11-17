import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { RowDataPacket } from 'mysql2/promise';
import { execute, pool, query } from '../src/db';

// Crea le tabelle che mancano leggendo schema.sql: quelle già presenti non vengono toccate.
async function createTables(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  for (const statement of schema
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)) {
    await execute(pool, statement.replace(/CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS '));
  }
  // Nei database creati con la vecchia versione c'era la tabella dei token monouso: ora non serve più.
  await execute(pool, 'DROP TABLE IF EXISTS api_tokens');
}

// Se nel .env c'è ADMIN_USERNAME, quell'account diventa admin (e viene creato se non esiste).
async function setupAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim();
  if (!username) return;

  const users = await query<RowDataPacket>(pool, 'SELECT id FROM users WHERE username = ?', [username]);
  if (users.length) {
    await execute(pool, 'UPDATE users SET is_admin = TRUE WHERE id = ?', [users[0].id]);
    console.log(`Ruolo admin assegnato all'account "${username}".`);
    return;
  }

  // L'account non esiste: per crearlo servono anche email e password.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.warn("Per creare l'admin servono ADMIN_EMAIL e ADMIN_PASSWORD (almeno 8 caratteri).");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await execute(
    pool,
    'INSERT INTO users(email, username, password_hash, is_admin) VALUES(?, ?, ?, TRUE)',
    [email, username, passwordHash],
  );
  await execute(pool, 'INSERT INTO avatars(user_id) VALUES(?)', [inserted.insertId]);
  console.log(`Account admin creato: "${username}".`);
}

async function initializeDatabase(): Promise<void> {
  try {
    await createTables();
    await setupAdmin();
    console.log('Database Hunter Gym pronto.');
  } finally {
    await pool.end();
  }
}

initializeDatabase().catch((error: unknown) => {
  console.error('Inizializzazione database fallita:', error);
  process.exitCode = 1;
});

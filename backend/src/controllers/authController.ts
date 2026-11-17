import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { execute, pool, query, withTransaction } from '../db';
import { apiError, serverError } from '../utils/responses';
import { cookieOptions, createSession, hashToken, SESSION_COOKIE } from '../utils/session';
import { getProfile } from '../services/profileService';

const validEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validUsername = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(value);

// Crea un nuovo account con il suo avatar iniziale.
export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, password } = req.body ?? {};
  if (
    !validEmail(email) ||
    !validUsername(username) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 72
  ) {
    apiError(res, 400, 'INVALID_INPUT', 'Email, username o password non validi');
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await withTransaction(async (connection) => {
      const inserted = await execute(
        connection,
        'INSERT INTO users(email, username, password_hash) VALUES(?, ?, ?)',
        [email.trim().toLowerCase(), username, passwordHash],
      );
      await execute(connection, 'INSERT INTO avatars(user_id) VALUES(?)', [inserted.insertId]);
    });
    res.status(201).json({ success: true, data: { message: 'Account creato. Ora puoi accedere.' } });
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      apiError(res, 409, 'ACCOUNT_EXISTS', 'Email o username già utilizzati');
      return;
    }
    serverError(res, 'Registrazione fallita', error);
  }
}

// Controlla le credenziali, crea la sessione (cookie httpOnly) e restituisce il profilo.
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body ?? {};
  if (!validUsername(username) || typeof password !== 'string' || password.length > 72) {
    apiError(res, 400, 'INVALID_INPUT', 'Username o password non validi');
    return;
  }
  try {
    const users = await query<RowDataPacket>(pool, 'SELECT id, password_hash FROM users WHERE username = ?', [
      username,
    ]);
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      apiError(res, 401, 'INVALID_CREDENTIALS', 'Credenziali non valide');
      return;
    }
    // Pulizia: a ogni login eliminiamo le sessioni già scadute.
    await execute(pool, 'DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()');
    await createSession(res, Number(user.id));
    res.json({ success: true, data: await getProfile(Number(user.id)) });
  } catch (error) {
    serverError(res, 'Errore login:', error);
  }
}

// Restituisce il profilo dell'utente collegato.
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const profile = await getProfile(req.userId as number);
    if (!profile) {
      apiError(res, 404, 'USER_NOT_FOUND', 'Utente non trovato');
      return;
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    serverError(res, 'Errore lettura account:', error);
  }
}

// Elimina la sessione dal database e il cookie dal browser.
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token) {
      await execute(pool, 'DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
    }
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ success: true, data: { message: 'Sessione terminata' } });
  } catch (error) {
    serverError(res, 'Errore logout:', error);
  }
}

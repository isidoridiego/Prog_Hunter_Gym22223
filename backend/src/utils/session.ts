import { createHash, randomBytes } from 'node:crypto';
import { CookieOptions, Response } from 'express';
import { execute, pool } from '../db';
import { SESSION_DAYS } from '../gameConfig';

// Nome del cookie che contiene il token di sessione.
export const SESSION_COOKIE = 'hunter_session';

// Opzioni del cookie: httpOnly impedisce a JavaScript di leggerlo, sameSite limita l'invio tra siti diversi.
// COOKIE_SECURE=true va attivato solo quando il sito è servito in HTTPS.
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
};

// Nel database salviamo solo l'hash: se il database trapela, i token non sono utilizzabili.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Crea una nuova sessione e manda il token al browser dentro il cookie.
export async function createSession(res: Response, userId: number): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await execute(
    pool,
    `INSERT INTO sessions(user_id, token_hash, expires_at)
     VALUES(?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [userId, hashToken(token), SESSION_DAYS],
  );
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

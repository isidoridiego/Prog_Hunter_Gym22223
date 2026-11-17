import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool, query } from '../db';
import { apiError, serverError } from '../utils/responses';
import { hashToken, SESSION_COOKIE } from '../utils/session';

// Controlla il cookie di sessione e salva l'id dell'utente in req.userId.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) {
    apiError(res, 401, 'SESSION_REQUIRED', 'Accesso richiesto');
    return;
  }

  try {
    const sessions = await query<RowDataPacket>(
      pool,
      'SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()',
      [hashToken(token)],
    );
    if (!sessions.length) {
      apiError(res, 401, 'SESSION_INVALID', 'Sessione scaduta o non valida');
      return;
    }
    req.userId = Number(sessions[0].user_id);
    next();
  } catch (error) {
    serverError(res, 'Errore controllo sessione:', error);
  }
}

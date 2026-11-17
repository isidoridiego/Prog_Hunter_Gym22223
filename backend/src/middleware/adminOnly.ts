import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool, query } from '../db';
import { apiError, serverError } from '../utils/responses';

// Lascia passare solo gli utenti con is_admin attivo (controllato ogni volta nel database).
export async function adminOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query<RowDataPacket>(pool, 'SELECT is_admin FROM users WHERE id=?', [req.userId]);
    if (!rows.length || !Boolean(rows[0].is_admin)) {
      apiError(res, 403, 'ADMIN_REQUIRED', 'Questa funzione è riservata agli amministratori.');
      return;
    }
    next();
  } catch (error) {
    serverError(res, 'Verifica ruolo admin fallita', error);
  }
}

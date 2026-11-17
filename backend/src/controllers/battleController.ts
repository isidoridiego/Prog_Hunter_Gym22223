import { Request, Response } from 'express';
import { createBattle, getBattle, listBattles } from '../services/battleService';
import { apiError, parseId, serverError } from '../utils/responses';
function userId(req: Request): number {
  return req.userId as number;
}
// POST /battles
export async function postBattle(req: Request, res: Response): Promise<void> {
  const opponentId = req.body?.opponentId;
  if (!Number.isSafeInteger(opponentId) || opponentId < 1) {
    apiError(res, 400, 'INVALID_OPPONENT_ID', 'Avversario non valido');
    return;
  }
  try {
    const result = await createBattle(userId(req), opponentId);
    if (result.kind === 'self') {
      apiError(res, 400, 'SELF_BATTLE', 'Non puoi sfidare te stesso');
      return;
    }
    if (result.kind === 'user_missing') {
      apiError(res, 404, 'OPPONENT_NOT_FOUND', 'Avversario non trovato');
      return;
    }
    if (result.kind === 'not_friends') {
      apiError(res, 403, 'OPPONENT_NOT_FRIEND', 'Puoi sfidare solo un amico accettato');
      return;
    }
    if (result.kind === 'daily_limit') {
      apiError(
        res,
        409,
        'DAILY_BATTLE_LIMIT',
        'Uno dei due cacciatori ha raggiunto il limite di battaglie di oggi',
      );
      return;
    }
    if (result.kind === 'avatar_missing') {
      apiError(res, 500, 'STATS_NOT_FOUND', 'Statistiche cacciatore non disponibili');
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    serverError(res, 'Gestione battaglie fallita', error);
  }
}
// GET /battles
export async function getBattles(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listBattles(userId(req)) });
  } catch (error) {
    serverError(res, 'Gestione battaglie fallita', error);
  }
}
// GET /battles/:id
export async function getBattleById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    apiError(res, 400, 'INVALID_ID', 'Identificativo non valido');
    return;
  }
  try {
    const battle = await getBattle(userId(req), id);
    if (!battle) {
      apiError(res, 404, 'BATTLE_NOT_FOUND', 'Battaglia non trovata');
      return;
    }
    res.json({ success: true, data: battle });
  } catch (error) {
    serverError(res, 'Gestione battaglie fallita', error);
  }
}

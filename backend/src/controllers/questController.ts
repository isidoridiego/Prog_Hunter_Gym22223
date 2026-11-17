import { Request, Response } from 'express';
import {
  completeQuest,
  getQuestHistory,
  getTodayQuests,
  listIncomingQuests,
  listOwnPendingQuests,
  verifyQuest,
} from '../services/questService';
import { apiError, parseId, serverError } from '../utils/responses';

const userId = (req: Request) => req.userId as number;

// GET /quests/today
export async function today(req: Request, res: Response): Promise<void> {
  try {
    const quests = await getTodayQuests(userId(req));
    if (!quests) {
      apiError(res, 404, 'USER_NOT_FOUND', 'Utente non trovato');
      return;
    }
    res.json({ success: true, data: quests });
  } catch (error) {
    serverError(res, 'Generazione quest fallita', error);
  }
}

// GET /quests/history
export async function history(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getQuestHistory(userId(req)) });
  } catch (error) {
    serverError(res, 'Storico quest non disponibile', error);
  }
}

// GET /quests/pending
export async function ownPending(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listOwnPendingQuests(userId(req)) });
  } catch (error) {
    serverError(res, 'Quest in attesa non disponibili', error);
  }
}

// POST /quests/:id/complete
export async function complete(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const verifierId = req.body?.verifierId;
  if (!id) {
    apiError(res, 400, 'INVALID_ID', 'Identificativo quest non valido');
    return;
  }
  if (verifierId !== undefined && (!Number.isSafeInteger(verifierId) || verifierId < 1)) {
    apiError(res, 400, 'INVALID_VERIFIER', 'Verificatore non valido');
    return;
  }
  try {
    const result = await completeQuest(userId(req), id, verifierId);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'QUEST_NOT_FOUND', 'Quest non trovata');
      return;
    }
    if (result.kind === 'already_done') {
      apiError(res, 409, 'QUEST_ALREADY_COMPLETED', 'Quest già completata o in verifica');
      return;
    }
    if (result.kind === 'no_friends') {
      apiError(res, 403, 'FRIEND_REQUIRED', 'Aggiungi un amico per far verificare la quest');
      return;
    }
    if (result.kind === 'not_friends') {
      apiError(res, 403, 'VERIFIER_NOT_FRIEND', 'Scegli un amico accettato');
      return;
    }
    if (result.kind === 'verifier_required') {
      apiError(res, 400, 'VERIFIER_REQUIRED', 'Scegli un amico verificatore');
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    serverError(res, 'Completamento quest fallito', error);
  }
}

// GET /quests/verifications/incoming
export async function incoming(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listIncomingQuests(userId(req)) });
  } catch (error) {
    serverError(res, 'Lettura verifiche quest fallita', error);
  }
}

// POST /quests/:id/verify
export async function resolve(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    apiError(res, 400, 'INVALID_ID', 'Identificativo quest non valido');
    return;
  }
  if (typeof req.body?.approved !== 'boolean') {
    apiError(res, 400, 'INVALID_DECISION', 'Indica se approvare la quest');
    return;
  }
  try {
    const result = await verifyQuest(userId(req), id, req.body.approved);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'QUEST_NOT_FOUND', 'Quest non trovata');
      return;
    }
    if (result.kind === 'forbidden') {
      apiError(res, 403, 'QUEST_VERIFICATION_FORBIDDEN', 'Non puoi verificare questa quest');
      return;
    }
    if (result.kind === 'already_done') {
      apiError(res, 409, 'QUEST_ALREADY_RESOLVED', 'La quest è già stata risolta');
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    serverError(res, 'Verifica quest fallita', error);
  }
}

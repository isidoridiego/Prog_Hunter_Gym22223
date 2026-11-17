import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import {
  equipItem,
  getPasswordHash,
  getProfile,
  setMonarchClass,
  updatePassword,
} from '../services/profileService';
import { MONARCH_CLASSES } from '../gameConfig';
import { apiError, serverError } from '../utils/responses';

const userId = (req: Request) => req.userId as number;

// GET /profile
export async function readProfile(req: Request, res: Response): Promise<void> {
  try {
    const profile = await getProfile(userId(req));
    if (!profile) {
      apiError(res, 404, 'USER_NOT_FOUND', 'Account non trovato');
      return;
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    serverError(res, 'Lettura profilo fallita', error);
  }
}

// PUT /profile/item
export async function changeEquippedItem(req: Request, res: Response): Promise<void> {
  const itemId = req.body?.itemId;
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    apiError(res, 400, 'INVALID_ITEM', 'Item non valido');
    return;
  }
  try {
    const result = await equipItem(userId(req), itemId);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'USER_NOT_FOUND', 'Account non trovato');
      return;
    }
    if (result.kind === 'invalid_item') {
      apiError(res, 404, 'ITEM_NOT_FOUND', 'Item non trovato');
      return;
    }
    if (result.kind === 'locked') {
      apiError(res, 403, 'ITEM_LOCKED', 'Raggiungi il rank richiesto per sbloccare questo item');
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    serverError(res, 'Cambio item fallito', error);
  }
}

// PUT /profile/monarch-class
export async function chooseMonarchClass(req: Request, res: Response): Promise<void> {
  const monarchClass = req.body?.monarchClass;
  if (
    typeof monarchClass !== 'string' ||
    !MONARCH_CLASSES.includes(monarchClass as (typeof MONARCH_CLASSES)[number])
  ) {
    apiError(res, 400, 'INVALID_MONARCH_CLASS', 'Classe Monarca non valida');
    return;
  }
  try {
    const result = await setMonarchClass(userId(req), monarchClass);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'USER_NOT_FOUND', 'Account non trovato');
      return;
    }
    if (result.kind === 'not_monarch') {
      apiError(res, 403, 'MONARCH_NOT_REACHED', 'La scelta si sblocca a 33.000 XP');
      return;
    }
    if (result.kind === 'already_chosen') {
      apiError(res, 409, 'MONARCH_CLASS_LOCKED', 'La classe Monarca è già stata scelta');
      return;
    }
    res.json({ success: true, data: await getProfile(userId(req)) });
  } catch (error) {
    serverError(res, 'Scelta classe Monarca fallita', error);
  }
}

// PUT /profile/password
export async function changePassword(req: Request, res: Response): Promise<void> {
  const current = req.body?.currentPassword,
    next = req.body?.newPassword;
  if (
    typeof current !== 'string' ||
    current.length > 72 ||
    typeof next !== 'string' ||
    next.length < 8 ||
    next.length > 72
  ) {
    apiError(res, 400, 'INVALID_PASSWORD', 'La nuova password deve contenere da 8 a 72 caratteri');
    return;
  }
  try {
    const hash = await getPasswordHash(userId(req));
    if (!hash) {
      apiError(res, 404, 'USER_NOT_FOUND', 'Account non trovato');
      return;
    }
    if (!(await bcrypt.compare(current, hash))) {
      apiError(res, 403, 'CURRENT_PASSWORD_INVALID', 'La password attuale non è corretta');
      return;
    }
    await updatePassword(userId(req), await bcrypt.hash(next, 10));
    res.json({ success: true, data: { message: 'Password aggiornata' } });
  } catch (error) {
    serverError(res, 'Cambio password fallito', error);
  }
}

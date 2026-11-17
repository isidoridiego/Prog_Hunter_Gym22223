import { Request, Response } from 'express';
import { getProfile } from '../services/profileService';
import { grantSelfRewards } from '../services/adminService';
import { apiError, serverError } from '../utils/responses';

const MAX_GRANT = 1_000_000_000;
const userId = (req: Request) => req.userId as number;

// POST /admin/self/rewards (solo admin)
export async function grantRewards(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};
  const grant = {
    xp: body.xp ?? 0,
    str: body.str ?? 0,
    vit: body.vit ?? 0,
    agi: body.agi ?? 0,
  };
  if (Object.values(grant).some((value) => !Number.isSafeInteger(value) || value < 0 || value > MAX_GRANT)) {
    apiError(
      res,
      400,
      'INVALID_REWARD',
      `Inserisci valori interi tra 0 e ${MAX_GRANT.toLocaleString('it-IT')}.`,
    );
    return;
  }
  if (Object.values(grant).every((value) => value === 0)) {
    apiError(res, 400, 'EMPTY_REWARD', 'Scegli almeno un valore da aumentare.');
    return;
  }

  try {
    const result = await grantSelfRewards(userId(req), grant);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'AVATAR_NOT_FOUND', 'Profilo cacciatore non trovato.');
      return;
    }
    const profile = await getProfile(userId(req));
    res.json({ success: true, data: { granted: result.granted, profile } });
  } catch (error) {
    serverError(res, 'Assegnazione ricompensa admin fallita', error);
  }
}

import { Request, Response } from 'express';
import {
  acceptFriendRequest,
  createFriendRequest,
  getFriendRequests,
  getLeaderboard,
  listFriends,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
} from '../services/friendService';
import { apiError, parseId, serverError } from '../utils/responses';
function currentUser(req: Request): number {
  return req.userId as number;
}
// GET /users/search
export async function getUserSearch(req: Request, res: Response): Promise<void> {
  const username = req.query.username;
  if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 20) {
    apiError(res, 400, 'INVALID_SEARCH', 'Inserisci almeno due caratteri e non più di venti');
    return;
  }
  try {
    res.json({ success: true, data: await searchUsers(currentUser(req), username.trim()) });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}
// GET /friends
export async function getFriends(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await listFriends(currentUser(req)) });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}
// GET /friends/leaderboard
export async function getFriendsLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getLeaderboard(currentUser(req)) });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}
// GET /friends/requests
export async function getRequests(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await getFriendRequests(currentUser(req)) });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}
// POST /friends/requests
export async function postRequest(req: Request, res: Response): Promise<void> {
  const targetId = req.body?.userId;
  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    apiError(res, 400, 'INVALID_USER_ID', 'Utente destinatario non valido');
    return;
  }
  try {
    const outcome = await createFriendRequest(currentUser(req), targetId);
    if (outcome.kind === 'self') {
      apiError(res, 400, 'SELF_FRIEND_REQUEST', 'Non puoi aggiungere te stesso');
      return;
    }
    if (outcome.kind === 'user_missing') {
      apiError(res, 404, 'USER_NOT_FOUND', 'Utente non trovato');
      return;
    }
    if (outcome.kind === 'already_friends') {
      apiError(res, 409, 'ALREADY_FRIENDS', 'Siete già amici');
      return;
    }
    if (outcome.kind === 'incoming_request') {
      apiError(res, 409, 'INCOMING_REQUEST_EXISTS', 'Questo utente ti ha già inviato una richiesta');
      return;
    }
    if (outcome.kind === 'request_exists') {
      apiError(res, 409, 'FRIEND_REQUEST_EXISTS', 'Esiste già una richiesta per questa coppia');
      return;
    }
    res.status(201).json({ success: true, data: outcome.data });
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      apiError(res, 409, 'FRIEND_REQUEST_EXISTS', 'Esiste già una richiesta per questa coppia');
      return;
    }
    serverError(res, 'Gestione amici fallita', error);
  }
}
async function respond(
  req: Request,
  res: Response,
  action: typeof acceptFriendRequest | typeof rejectFriendRequest,
): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    apiError(res, 400, 'INVALID_ID', 'Identificativo non valido');
    return;
  }
  try {
    const result = await action(currentUser(req), id);
    if (result.kind === 'not_found') {
      apiError(res, 404, 'FRIEND_REQUEST_NOT_FOUND', 'Richiesta non trovata');
      return;
    }
    if (result.kind === 'not_pending') {
      apiError(res, 409, 'FRIEND_REQUEST_RESOLVED', `La richiesta è già ${result.status}`);
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}
// POST /friends/requests/:id/accept
export async function postAccept(req: Request, res: Response): Promise<void> {
  await respond(req, res, acceptFriendRequest);
}
// POST /friends/requests/:id/reject
export async function postReject(req: Request, res: Response): Promise<void> {
  await respond(req, res, rejectFriendRequest);
}
// DELETE /friends/:userId
export async function deleteFriend(req: Request, res: Response): Promise<void> {
  const otherId = parseId(req.params.userId);
  if (!otherId) {
    apiError(res, 400, 'INVALID_ID', 'Identificativo non valido');
    return;
  }
  try {
    const result = await removeFriend(currentUser(req), otherId);
    if (result.kind === 'invalid') {
      apiError(res, 400, 'INVALID_ID', 'Identificativo non valido');
      return;
    }
    if (result.kind === 'not_found') {
      apiError(res, 404, 'FRIENDSHIP_NOT_FOUND', 'Amicizia non trovata');
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    serverError(res, 'Gestione amici fallita', error);
  }
}

import { Router } from 'express';
import {
  deleteFriend,
  getFriends,
  getFriendsLeaderboard,
  getRequests,
  getUserSearch,
  postAccept,
  postReject,
  postRequest,
} from '../controllers/friendController';
const router = Router();
router.get('/users/search', getUserSearch);
router.get('/friends', getFriends);
router.get('/friends/leaderboard', getFriendsLeaderboard);
router.get('/friends/requests', getRequests);
router.post('/friends/requests', postRequest);
router.post('/friends/requests/:id/accept', postAccept);
router.post('/friends/requests/:id/reject', postReject);
router.delete('/friends/:userId', deleteFriend);
export default router;

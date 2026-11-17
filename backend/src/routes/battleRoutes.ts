import { Router } from 'express';
import { getBattleById, getBattles, postBattle } from '../controllers/battleController';
const router = Router();
router.post('/battles', postBattle);
router.get('/battles', getBattles);
router.get('/battles/:id', getBattleById);
export default router;

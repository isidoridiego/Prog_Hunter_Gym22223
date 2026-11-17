import { Router } from 'express';
import { grantRewards } from '../controllers/adminController';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();
router.post('/admin/self/rewards', adminOnly, grantRewards);
export default router;

import { Router } from 'express';
import {
  readProfile,
  changePassword,
  changeEquippedItem,
  chooseMonarchClass,
} from '../controllers/profileController';
const router = Router();
router.get('/profile', readProfile);
router.put('/profile/password', changePassword);
router.put('/profile/item', changeEquippedItem);
router.put('/profile/monarch-class', chooseMonarchClass);
export default router;

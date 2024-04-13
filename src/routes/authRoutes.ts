import { Router } from 'express';
import AuthController from '../controllers/AuthController';

const router = Router();

router.post('/registration', AuthController.register);
router.post('/login', AuthController.logIn);
router.get('/logout', AuthController.logout);

export default router;

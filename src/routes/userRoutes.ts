import { Router } from 'express';
import UserController from '../controllers/UserController';

const router = Router();

// router.get('/', UserController.getUsers);
router.get('/', UserController.getAll);
router.post('/filter', UserController.getAllUsersFiltered);
router.get('/:id', UserController.getOne);
router.post('/upd/:id', UserController.updateProfile);
router.post('/del/:id', UserController.deleteUser);

export default router;

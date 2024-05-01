import { Router } from 'express';
import CommentController from '../controllers/CommentController';

const router = Router();

router.get('/', CommentController.getAll)
router.get('/:posterId', CommentController.getPosterComments)
router.post('/add', CommentController.createComment);
router.post('/addcomplaint', CommentController.processComplaint);
router.post('/setcommentsread', CommentController.updateReadByAuthorInComments);
router.post('/upd/:id', CommentController.updateComment);
router.post('/approve/:id', CommentController.approveComment);
router.post('/del/:id', CommentController.deleteComment);
// router.post('/login', CommentController.logIn);
// router.get('/logout', CommentController.logout);

export default router;

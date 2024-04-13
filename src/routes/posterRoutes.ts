import { Router } from 'express';
import PosterController from '../controllers/PosterController';

import multer from 'multer';
import { v4 as uuidv4 } from 'uuid'; // Используем для генерации уникального имени файла
import path from 'path';

const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      const pathToSrcDir = path.resolve(__dirname, '..');
      const pathIntoUploadsDir = path.join(pathToSrcDir, 'uploads/');
      console.log('path - ', pathIntoUploadsDir)
      cb(null, pathIntoUploadsDir); // Указываем папку для сохранения загружаемых файлов
   },
   filename: function (req, file, cb) {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`; // Генерируем уникальное имя файла
      cb(null, uniqueFilename); // Устанавливаем уникальное имя файла
   },
});

const upload = multer({ storage: storage });

const router = Router();

router.get('/', PosterController.getAllPosters);
router.get('/categories', PosterController.getAllCategories);
router.get('/deletereasons', PosterController.getAllPosterDeleteReasons);
router.get('/posterstatuses', PosterController.getAllPosterStatuses);
router.get('/my', PosterController.getCurrentUserPosters);
router.post('/create', upload.single('photo'), PosterController.createPoster);
router.post('/decide', PosterController.updatePosterStatus);
router.post('/upd/:id', upload.single('photo'), PosterController.updatePoster);
router.post('/del', PosterController.deletePoster);
router.post('/filter', PosterController.getAllPostersFiltered);

router.get('/:id', PosterController.getPosterById);

export default router;

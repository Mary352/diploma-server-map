import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';
import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import posterRoutes from './routes/posterRoutes';
import commentRoutes from './routes/commentRoutes';
import path from 'path';

const PORT = process.env.PORT;
// const COOKIE_SECRET = process.env.COOKIE_SECRET || '1234567890';
// const COOKIE_SECRET = process.env.COOKIE_SECRET;
// const ACCESS_KEY: Secret | GetPublicKeyOrSecret = process.env.ACCESS_KEY;
// const SALT_ROUNDS = 3;

// Расширяем интерфейс Request добавлением свойства payload
declare global {
   namespace Express {
      interface Request {
         payload?: JwtPayload; // Объявляем опциональное свойство payload типа JwtPayload
      }
   }
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
   origin: ["http://localhost:3000", "https://diploma-server-map.onrender.com"],
   // origin: '*',
   credentials: true,
}));
// app.use(cors());



app.use((req: Request, res: Response, next: NextFunction) => {
   // console.log('path - ', path.join(__dirname, 'uploads'))
   console.log('----------app.use-------------------')
   console.log('req.cookies', req.cookies?.accessToken)
   if (req.cookies?.accessToken) {
      console.log('req.cookies', req.cookies?.accessToken)
      // const verifyOptions: VerifyOptions = {}; // опции верификации JWT
      const verifyOptions: VerifyOptions = {
         complete: true, // Указание complete: true для получения полной информации из токена
      };
      jwt.verify(req.cookies.accessToken, process.env.ACCESS_KEY as string, verifyOptions, (err, decoded) => {
         if (err) {
            next();
         } else if (decoded) {
            req.payload = decoded as JwtPayload;
            next();
         }
      });
   } else {
      console.log('next', req.cookies?.accessToken)
      next();
   }
});

app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/posters', posterRoutes);
app.use('/comments', commentRoutes);

app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
});

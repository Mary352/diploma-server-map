import { Request, Response } from 'express';
import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { User, Message, UserLogin } from '../utils/types';
import { roles } from '../utils/commonVars';
import { getDateTimeNow } from '../utils/commonFunctions';

const ACCESS_KEY = "ACCESS_KEY";
const SALT_ROUNDS = 3;

// interface User {
//    email: string;
//    name: string;
//    password: string;
//    phone: string;
//    address: string;
//    role: string;
// }

function returnUserInfoToMakeDecisions(req: Request) {
   const isAuth = req.payload && req.payload.payload ? true : false
   const isNotAdmin = req.payload && req.payload.payload && req.payload.payload.role === 'admin' ? false : true
   console.log("🚀 ~ file: AuthController.ts:26 ~ returnUserInfoToMakeDecisions ~ req.payload:", req.payload)
   // const userLoginForLink = req.payload ? req.payload.login : '#'

   return {
      isAuth: isAuth,
      isNotAdmin: isNotAdmin,
      // userLoginForLink: userLoginForLink 
   }
}

class AuthController {
   // private accessKey: string = 'your_access_key_here';

   public async logIn(req: Request, res: Response) {
      // public async logIn(req: Request, res: Response): Promise<void> {

      const message: Message = {
         accountInfo: {
            isAuth: false,
            isNotAdmin: false
         }
      };
      const { email, password }: UserLogin = req.body;

      // ! сделать валидацию на клиенте
      if (!email || !password) {
         message.error = 'Заполните все поля корректными данными';
         // message.accountInfo = {
         //    isAuth: false,
         //    isNotAdmin: false
         // }
         res.status(400).json(message);
         return;
         // return res.render('login.hbs', {
         //    layout: 'unauth',
         //    errMessage: message.error,
         //    reqBodyFields: req.body,
         //    scriptFile: 'script_login.js',
         //    styleFile: 'style_login.css',
         // });
      }

      try {
         const candidate: User | null = await prisma.users.findFirst({
            where: {
               email: email,
            },
         });

         if (!candidate) {
            message.error = `Пользователь с email ${email} не найден`;
            res.status(404).json(message);
            return;
            // return res.render('login.hbs', {
            //    layout: 'unauth',
            //    errMessage: message.error,
            //    reqBodyFields: req.body,
            //    scriptFile: 'script_login.js',
            //    styleFile: 'style_login.css',
            // });
         }

         const validPassword: boolean = bcrypt.compareSync(password, candidate.password);

         if (!validPassword) {
            message.error = 'Пароль неверный';
            res.status(404).json(message);
            return;

            // return res.render('login.hbs', {
            //    layout: 'unauth',
            //    errMessage: message.error,
            //    reqBodyFields: req.body,
            //    scriptFile: 'script_login.js',
            //    styleFile: 'style_login.css',
            // });
         }

         const updatedUserActivity = await prisma.users.update({
            where: {
               id: candidate.id,
            },
            data: {
               lastActivityTime: getDateTimeNow()
            },
         });

         console.log('updatedUserActivity while login - ', updatedUserActivity)

         const payload = {
            id: candidate.id,
            email: candidate.email,
            role: candidate.role,
         };

         const accessToken: string = jwt.sign(payload, ACCESS_KEY, {
            expiresIn: '2d',
            // expiresIn: '5s',
         });

         res.cookie('accessToken', accessToken);

         message.message = 'Вход осуществлён';
         // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

         message.accountInfo = {
            isAuth: true,
            isNotAdmin: candidate.role === 'admin' ? false : true,
            userId: candidate.id,
            accessToken: accessToken,
         }
         res.json(message);
         return;
         // !redirect to main page
         // return res.redirect('/');
      } catch (error) {
         // Обработка ошибок при выполнении запроса к базе данных или других ошибок
         console.error('Ошибка входа:', error);
         const message: Message = {
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }
         };
         message.error = 'Произошла ошибка входа';
         res.status(500).json(message);
         return;
         // res.status(500).send('Произошла ошибка входа');
      }
   }

   public async logout(req: Request, res: Response) {
      // public async logIn(req: Request, res: Response): Promise<void> {

      const message: Message = {
         accountInfo: {
            isAuth: false,
            isNotAdmin: false
         }
      };
      try {
         res.cookie('accessToken', '');

         message.message = 'Выход осуществлён';
         // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);


         res.json(message);
         return;
      }
      catch (error) {
         // Обработка ошибок при выполнении запроса к базе данных или других ошибок
         console.error('Ошибка выхода:', error);
         const message: Message = {
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }
         };
         message.error = 'Произошла ошибка выхода';
         res.status(500).json(message);
         return;
         // res.status(500).send('Произошла ошибка входа');
      }
   }

   public async isAuth(req: Request, res: Response) {
      // public async logIn(req: Request, res: Response): Promise<void> {
      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req)

      const message: Message = {
         message: 'auth info',
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin
         }
      };
      try {
         // res.cookie('accessToken', '');

         message.message = 'Выход осуществлён';
         // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);


         res.json(message);
         return;
      }
      catch (error) {
         // Обработка ошибок при выполнении запроса к базе данных или других ошибок
         console.error('Ошибка выхода:', error);
         const message: Message = {
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }
         };
         message.error = 'Произошла ошибка выхода';
         res.status(500).json(message);
         return;
         // res.status(500).send('Произошла ошибка входа');
      }
   }

   public async register(req: Request, res: Response) {
      // public async register(req: Request, res: Response): Promise<void> {
      const { email, name, password, phone, address, coord0, coord1 }: User = req.body;

      // !валидация у клиента
      if (!email || !name || !password || !phone || !address || !coord0 || !coord1) {
         const message: Message = {
            error: 'Заполните все поля корректными данными',
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }
         };
         res.status(400).json(message);
         return;
      }

      try {
         const existingUser = await prisma.users.findFirst({
            where: {
               email: email,
            },
         });

         if (existingUser) {
            const message: Message = {
               error: `Пользователь с email ${email} уже существует`,
               accountInfo: {
                  isAuth: false,
                  isNotAdmin: false
               }
            };
            res.status(400).json(message);
            return;
         }

         // длина строки фиксирована и всегда = 60, проследить размер в бд
         const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS); // Вы можете выбрать необходимый уровень сложности
         // console.log(hashedPassword.length)

         const ms = Date.now()
         const date = new Date(ms)

         const newUser = await prisma.users.create({
            data: {
               email: email,
               name: name,
               password: hashedPassword,
               phone: phone,
               address: address,
               coord0,
               coord1,
               role: roles.user,
               lastActivityTime: getDateTimeNow(),
            },
         });

         const message: Message = {
            message: `Пользователь создан`,
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }
         };
         res.status(201).json(message);
         // return res.redirect('/auth/login');
         return;

      } catch (error) {
         console.error('Ошибка при регистрации:', error);
         // const message: Message = {
         //    error: 'Произошла ошибка при регистрации',

         // };
         const message: Message = {
            error: 'Произошла ошибка при регистрации',
            accountInfo: {
               isAuth: false,
               isNotAdmin: false
            }

         };
         res.status(500).json(message);
         // return res.redirect('auth/registration')
         return;
      }
   }
}

export default new AuthController();
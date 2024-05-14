import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client'
import { Message, User } from '../utils/types';
import { errors, roles } from '../utils/commonVars';
import { formatDateTime, getDateTimeNow } from '../utils/commonFunctions';
const prisma = new PrismaClient()

function returnUserInfoToMakeDecisions(req: Request) {
   const isAuth = req.payload && req.payload.payload ? true : false
   console.log("🚀 ~ file: UserController.ts:9 ~ returnUserInfoToMakeDecisions ~ isAuth:", isAuth)
   const isNotAdmin = req.payload && req.payload.payload && req.payload.payload.role === 'admin' ? false : true
   console.log("🚀 ~ file: UserController.ts:11 ~ returnUserInfoToMakeDecisions ~ isNotAdmin:", isNotAdmin)
   console.log("🚀 ~ file: UserController.ts:10 ~ returnUserInfoToMakeDecisions ~ req.payload:", req.payload)
   // const userLoginForLink = req.payload ? req.payload.login : '#'

   return {
      isAuth: isAuth,
      isNotAdmin: isNotAdmin,
      // userLoginForLink: userLoginForLink 
   }
}

class UserController {
   // async getUsers(req: Request, res: Response) {

   //    const posterStatusesArr = await prisma.posterStatuses.findMany();
   //    const message: Message = { message: posterStatusesArr }
   //    res.json(message);
   //    return;
   // }

   // async getAll(req: Request, res: Response): Promise<void> {
   async getAll(req: Request, res: Response) {

      if (!req.payload) {
         // res.redirect('/auth/login');
         // const message: Message = {
         //    error: 'Неавторизован. Перенаправить на стр. входа',
         // };
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.unAuthorized,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(401).json(message)
         return;
      }
      else if (req.payload.payload?.role === roles.admin) {
         const usersArr: User[] = await prisma.users.findMany({
            orderBy: {
               lastActivityTime: 'asc',
            },
            // orderBy: {
            //    email: 'asc',
            // },
         });

         // usersArr.map(user => {
         //    const dtLastActivity = formatDateTime(new Date(user.lastActivityTime))
         //    user.lastActivityTime = dtLastActivity;

         //    // if (poster.publishDate && poster.publishDate !== null) {
         //    //    const dtPub = formatDate(new Date(poster.publishDate))
         //    //    poster.publishDate = dtPub;
         //    // }

         //    return user
         // })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: usersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message);
         return;

      }
      else {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.forbidAccess,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(403).json(message);
         return;
      }
   }

   async getAllUsersFiltered(req: Request, res: Response) {

      if (!req.payload) {
         // res.redirect('/auth/login');
         // const message: Message = {
         //    error: 'Неавторизован. Перенаправить на стр. входа',
         // };
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.unAuthorized,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(401).json(message)
         return;
      }
      else if (req.payload.payload?.role === roles.admin) {
         const { userRole } = req.body;
         const usersArr = await prisma.users.findMany({
            where: {
               role: userRole
            },
            orderBy: {
               email: 'asc',
            },
         });

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: usersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message);
         return;

      }
      else {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.forbidAccess,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(403).json(message);
         return;
      }
   }

   async getOne(req: Request, res: Response) {
      // console.log('req.payload getAll ', req.payload)
      // console.log('req.payload getAll ', req.payload?.payload?.role)

      if (!req.payload) {
         // res.redirect('/auth/login');
         // const message: Message = {
         //    error: 'Неавторизован. Перенаправить на стр. входа',
         // };
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.unAuthorized,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(401).json(message)
         return;
      }
      else {

         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const userId = parseInt(req.params.id);
            // console.log("🚀 ~ file: UserController.ts:131 ~ getOne ~ userId:", userId)

            if (isNaN(userId)) {
               console.log("🚀 ~ file: UserController.ts:135 ~ getOne ~ isNaN")

               const message: Message = {
                  error: `Пользователь с id ${req.params.id} не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            const currentUserId = req.payload?.payload?.id;
            const currentUserRole = req.payload?.payload?.role;



            if (currentUserId !== userId && currentUserRole !== roles.admin) {
               const message: Message = {
                  error: errors.forbidAccess,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(403).json(message);
               return;
            }

            console.log("🚀 ~ file: UserController.ts:130 ~ getOne ~ userId:", userId)

            const user = await prisma.users.findUnique({
               where: {
                  id: userId
               }
            });

            // если пользователь удалён, а токен ещё действителен
            if (!user && currentUserId === userId) {

               const message: Message = {
                  error: `Аккаунт удалён. Зарегистрируйтесь`,
                  accountInfo: {
                     isAuth: false,
                     isNotAdmin: false,
                  }
               };
               res.status(401).json(message);
               return;
            }
            if (!user) {

               const message: Message = {
                  error: `Пользователь с id ${userId} не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               message: user,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.json(message);
            return;
         } catch (error) {
            const userId = req.params.id;
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: `Пользователь с id ${userId} не найден`,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(404).json(message);
            return;
         }
      }
   }

   async updateProfile(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.unAuthorized,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(401).json(message)
         return;
      }
      else {
         try {
            const userId = parseInt(req.params.id);
            // const userEmail = req.payload?.payload?.email;
            const currentUserId = req.payload?.payload?.id;
            const currentUserRole = req.payload?.payload?.role;

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            // ! валидация на клиенте
            // const { name, password, phone, address } = req.body;
            const { email, name, phone, address, role, coord0, coord1 } = req.body;

            if (currentUserId !== userId && currentUserRole !== roles.admin) {
               const message: Message = {
                  error: errors.forbidAccess,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(403).json(message);
               return;
            }

            const user = await prisma.users.findUnique({
               where: {
                  id: userId
               }
            });

            if (!user) {

               const message: Message = {
                  error: `Пользователь с id ${userId} не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            let updatedUser;
            if (currentUserRole === roles.admin) {
               if (userId === currentUserId) {
                  // обновление профиля админа
                  updatedUser = await prisma.users.update({
                     where: {
                        id: currentUserId,
                     },
                     data: {
                        // email,
                        name,
                        // password,
                        phone,
                        address: address ? address : undefined,
                        coord0: coord0 ? coord0 : undefined,
                        coord1: coord1 ? coord1 : undefined,
                        lastActivityTime: getDateTimeNow()
                     },
                  });

                  console.log('updatedUser - ', updatedUser)
               }
               else {
                  // админ меняет роль пользователя, не себя
                  updatedUser = await prisma.users.update({
                     where: {
                        id: userId,
                     },
                     data: {
                        role
                     },
                  });

                  console.log('updatedUser - ', updatedUser)
               }
            }
            else {
               // обновление пользователем своего профиля
               updatedUser = await prisma.users.update({
                  where: {
                     id: currentUserId,
                  },
                  data: {
                     // email,
                     name,
                     // password,
                     phone,
                     address: address ? address : undefined,
                     coord0: coord0 ? coord0 : undefined,
                     coord1: coord1 ? coord1 : undefined,
                     lastActivityTime: getDateTimeNow()
                  },
               });

               console.log('updatedUser - ', updatedUser)
            }

            // if (req.payload?.payload?.role === roles.admin) {

            //    // ! изменить условия для профиля админа
            //    if (!email) {
            //       // обновление профиля админа
            //       const updatedUser = await prisma.users.update({
            //          where: {
            //             id: currentUserId,
            //          },
            //          data: {
            //             // email,
            //             name,
            //             // password,
            //             phone,
            //             address
            //          },
            //       });

            //       console.log('updatedUser - ', updatedUser)
            //    }
            //    else {
            //       // админ меняет роль пользователя, не себя
            //       if (email === userEmail) {
            //          // const message: Message = {
            //          //    error: 'Нельзя изменить свою роль',
            //          // };
            //          // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            //          const message: Message = {
            //             error: 'Нельзя изменить свою роль',
            //             accountInfo: {
            //                isAuth: isAuth,
            //                isNotAdmin: isNotAdmin,
            //             }
            //          };
            //          res.status(403).json(message);
            //          return;
            //       }
            //       const updatedUser = await prisma.users.update({
            //          where: {
            //             id: currentUserId,
            //          },
            //          data: {
            //             role
            //          },
            //       });

            //       console.log('updatedUser - ', updatedUser)
            //    }

            // }
            // else {
            //    // обновление пользователем своего профиля
            //    const updatedUser = await prisma.users.update({
            //       where: {
            //          id: currentUserId,
            //       },
            //       data: {
            //          // email,
            //          name,
            //          // password,
            //          phone,
            //          address,
            //       },
            //    });

            //    console.log('updatedUser - ', updatedUser)
            // }

            // const message: Message = {
            //    message: 'Данные пользователя обновлены',
            //    // user: updatedUser,
            // };
            // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               message: updatedUser,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.json(message);
            return;

         } catch (error) {
            console.log("🚀 ~ file: UserController.ts:123 ~ updateProfile ~ error:", error)
            // const message: Message = {
            //    error: 'Произошла ошибка при обновлении данных пользователя',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при обновлении данных пользователя',
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(500).json(message);
            return;
         }
      }
   }

   async deleteUser(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: errors.unAuthorized,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(401).json(message)
         return;
      }
      else {
         // const userEmail = req.payload?.payload?.email;
         const userId = req.payload?.payload?.id;
         console.log("🚀 ~ file: UserController.ts:225 ~ deleteUser ~ userId:", userId)
         // console.log("🚀 ~ file: UserController.ts:134 ~ deleteUser ~ userEmail:", userEmail)
         const userRole = req.payload?.payload?.role;
         // const { id } = req.body;

         // // Проверка, что пользователь может удалять только свой профиль
         // if (email !== userEmail && email !== undefined) {
         //    const message: Message = {
         //       error: 'Нельзя удалять профиль другого пользователя',
         //    };
         //    res.status(403).json(message);
         //    return;
         // }

         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const toDeleteUserId = parseInt(req.params.id);
            // console.log("🚀 ~ file: UserController.ts:131 ~ getOne ~ toDeleteUserId:", toDeleteUserId)

            if (isNaN(toDeleteUserId)) {
               console.log("🚀 ~ file: UserController.ts:135 ~ getOne ~ isNaN")

               const message: Message = {
                  error: `Пользователь с id ${req.params.id} не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }
            // ! не выводить кнопку удаления у ролей админ 
            // Пользователь с ролью admin не может удалить себя или других пользователей с ролью admin
            if (userRole === roles.admin) {
               const userToDelete = await prisma.users.findUnique({
                  where: {
                     id: toDeleteUserId,
                  },
               });

               if (!userToDelete) {
                  // const message: Message = {
                  //    error: 'Пользователь не найден',
                  // };
                  const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
                  const message: Message = {
                     error: 'Пользователь не найден',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  res.status(404).json(message);
                  return;
               }

               if (userToDelete.role === roles.admin) {
                  // const message: Message = {
                  //    error: 'Нельзя удалять профиль пользователя с ролью admin',
                  // };
                  const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
                  const message: Message = {
                     error: 'Нельзя удалять профиль пользователя с ролью admin',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  res.status(403).json(message);
                  return;
               }

               // ! Сначала удалить комменты юзера
               const deletedRowsNum = await prisma.posterComments.deleteMany({
                  where: {
                     userId: toDeleteUserId,
                  }
               })
               console.log("🚀🚀🚀 ~ deleteUser ~ deletedRowsNum:", deletedRowsNum)

               const deletedUser = await prisma.users.delete({
                  where: {
                     id: toDeleteUserId,
                  },
               });

               console.log("🚀 ~ file: UserController.ts:203 ~ deleteUser ~ deletedUser:", deletedUser)

               // const message: Message = {
               //    message: 'Пользователь успешно удален',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: 'Пользователь успешно удален',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               return;
               // return;
            }
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  error: errors.forbidAccess,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               return;
            }

            // let deletedUser;
            // if (userRole === roles.admin) {

            // }
            // else {

            // const deletedUser = await prisma.users.delete({
            //    where: {
            //       email: userEmail,
            //    },
            // });
            // }
            // console.log("🚀 ~ file: UserController.ts:186 ~ deleteUser ~ deletedUser:", deletedUser)

            // ! перенаправить на регистрацию
            // res.redirect('/');
            // return;

         } catch (error) {
            console.log("🚀 ~ file: UserController.ts:200 ~ deleteUser ~ error:", error)
            // const message: Message = {
            //    error: 'Произошла ошибка при удалении пользователя',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при удалении пользователя',
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(500).json(message);
            return;
         }
      }

   }


}

export default new UserController();
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Message, Poster, PosterWithReasons, UpdateData } from '../utils/types';
import * as fs from 'fs';
import { errors, posterStatuses, roles } from '../utils/commonVars';
import path from 'path';
import { formatDate, getDateToday } from '../utils/commonFunctions';

const prisma = new PrismaClient();

function returnUserInfoToMakeDecisions(req: Request) {
   const isAuth = req.payload && req.payload.payload ? true : false
   const isNotAdmin = req.payload && req.payload.payload && req.payload.payload.role === 'admin' ? false : true
   return {
      isAuth: isAuth,
      isNotAdmin: isNotAdmin,
   }
}

class PosterController {
   async getAllPosters(req: Request, res: Response) {
      const role = req.payload?.payload?.role;

      if (role === roles.admin) {   // админ видит все, (кроме имеющих статус Удалено - нет, пока абосолютно все), в убывающем порядке нумерации по id (от последнего к первому)

         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.deleted
            }
         });
         console.log("🚀 ~ file: PosterController.ts:21 ~ PosterController ~ getAllPosters ~ posterStatusFull:", posterStatusFull)
         // where - чтобы не показывать удалённые
         const postersArr: Poster[] = await prisma.posters.findMany({
            // where: {
            //    posterStatusId: {
            //       not: posterStatusFull?.id,
            //    }
            // },
            include: {
               ObjectCategories: {
                  select: {
                     category: true,
                  },
               },
               PosterStatuses: {
                  select: {
                     statusName: true
                  }
               },
            },
            orderBy: {
               id: 'desc',
            },
         });

         postersArr.map(poster => {
            const dtAct = formatDate(new Date(poster.dateOfAction))
            poster.dateOfAction = dtAct;

            if (poster.publishDate && poster.publishDate !== null) {
               const dtPub = formatDate(new Date(poster.publishDate))
               poster.publishDate = dtPub;
            }

            return poster
         })

         // const posterArrNormalDate = postersArr.map(poster => {
         //    console.log('----------');

         //    console.log(new Date(poster.dateOfAction));

         //    return new Date(poster.dateOfAction)
         // })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: postersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message);
         return;
      }
      else {   // все, кроме админа, видят только со статусом Опубликовано, в порядке убывания даты публикации
         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.published
            }
         });
         console.log("🚀 ~ file: PosterController.ts:46 ~ PosterController ~ getAllPosters ~ posterStatusFull:", posterStatusFull)

         const postersArr: Poster[] = await prisma.posters.findMany({
            where: {
               posterStatusId: posterStatusFull?.id
            },
            include: {
               ObjectCategories: {
                  select: {
                     category: true,
                  },
               },
               PosterStatuses: {
                  select: {
                     statusName: true
                  }
               },
            },
            orderBy: {
               publishDate: 'desc',
            },
         });

         postersArr.map(poster => {
            const dtAct = formatDate(new Date(poster.dateOfAction))
            poster.dateOfAction = dtAct;

            if (poster.publishDate && poster.publishDate !== null) {
               const dtPub = formatDate(new Date(poster.publishDate))
               poster.publishDate = dtPub;
            }

            return poster
         })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

         const message: Message = {
            message: postersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         // const message: Message = {
         //    message: postersArr,
         // };
         res.json(message);
         return;
      }

      // try {
      //    const posterId = parseInt(req.params.id);
      //    const poster = await prisma.posters.findUnique({
      //       where: {
      //          id: posterId,
      //       },
      //    });

      //    res.json(poster);
      //    return;
      // } catch (error) {
      //    console.error('Ошибка получения объявления:', error);
      //    const message: Message = {
      //       error: 'Произошла ошибка при получении объявления',
      //    };
      //    res.status(500).json(message);
      //    return;
      // }
   }

   async getAllPostersFiltered(req: Request, res: Response) {
      const role = req.payload?.payload?.role;
      const { posterStatusName, isPet, objectCategory, description, itemStatus, dateOfAction, address, phone } = req.body;

      if (role === roles.admin) {   // админ видит все, (кроме имеющих статус Удалено - нет, пока абосолютно все), в убывающем порядке нумерации по id (от последнего к первому)

         // const posterStatusFull = await prisma.posterStatuses.findFirst({
         //    where: {
         //       statusName: posterStatuses.deleted
         //    }
         // });

         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatusName
            }
         });

         // console.log("🚀 ~ file: PosterController.ts:21 ~ PosterController ~ getAllPosters ~ posterStatusFull:", posterStatusFull)
         // where - чтобы не показывать удалённые
         const postersArr: Poster[] = await prisma.posters.findMany({
            // where: {
            //    posterStatusId: {
            //       not: posterStatusFull?.id,
            //    }
            // },
            where: {
               posterStatusId: posterStatusFull?.id
            },
            include: {
               ObjectCategories: {
                  select: {
                     category: true,
                  },
               },
               PosterStatuses: {
                  select: {
                     statusName: true
                  }
               },
            },
            orderBy: {
               id: 'asc',
            },
         });

         postersArr.map(poster => {
            const dtAct = formatDate(new Date(poster.dateOfAction))
            poster.dateOfAction = dtAct;

            if (poster.publishDate && poster.publishDate !== null) {
               const dtPub = formatDate(new Date(poster.publishDate))
               poster.publishDate = dtPub;
            }

            return poster
         })

         // const posterArrNormalDate = postersArr.map(poster => {
         console.log('----------');

         //    console.log(new Date(poster.dateOfAction));

         //    return new Date(poster.dateOfAction)
         // })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: postersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message);
         return;
      }
      else {   // все, кроме админа, видят только со статусом Опубликовано, в порядке убывания даты публикации
         console.log('---user filter start-------');
         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.published
            }
         });

         const itemCategoryFull = await prisma.objectCategories.findFirst({
            where: {
               category: objectCategory
            }
         });

         const filters: any = {
            posterStatusId: posterStatusFull?.id,
         };

         if (itemStatus !== undefined) {
            filters.itemStatus = { equals: itemStatus };
         }

         if (isPet !== undefined) {
            filters.isPet = { equals: isPet };
         }

         if (objectCategory) {

            filters.itemCategoryId = { equals: itemCategoryFull?.id };
         }

         console.log("🚀 ~ file: PosterController.ts:270 ~ getAllPostersFiltered ~ filters:", filters)
         console.log('---user filter end-------');
         const postersArr: Poster[] = await prisma.posters.findMany({
            where: filters,
            include: {
               ObjectCategories: {
                  select: {
                     category: true,
                  },
               },
               PosterStatuses: {
                  select: {
                     statusName: true
                  }
               },
            },
            orderBy: {
               publishDate: 'desc',
            },
         });
         // const itemStatusFull = await prisma..findFirst({
         //    where: {
         //       statusName: posterStatuses.published
         //    }
         // });

         // const postersArr: Poster[] = await prisma.posters.findMany({
         //    where: {
         //       posterStatusId: posterStatusFull?.id,
         //       itemStatus: itemStatus || undefined
         //    },
         //    include: {
         //       ObjectCategories: {
         //          select: {
         //             category: true,
         //          },
         //       },
         //       PosterStatuses: {
         //          select: {
         //             statusName: true
         //          }
         //       },
         //    },
         //    orderBy: {
         //       publishDate: 'desc',
         //    },
         // });

         postersArr.map(poster => {
            const dtAct = formatDate(new Date(poster.dateOfAction))
            poster.dateOfAction = dtAct;

            if (poster.publishDate && poster.publishDate !== null) {
               const dtPub = formatDate(new Date(poster.publishDate))
               poster.publishDate = dtPub;
            }

            return poster
         })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

         const message: Message = {
            // !postersArr
            message: postersArr,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         // const message: Message = {
         //    message: postersArr,
         // };
         res.json(message);
         return;
      }
   }

   async getAllCategories(req: Request, res: Response) {
      // const role = req.payload?.payload?.role;

      const categoriesArr: {
         id: number;
         category: string;
      }[] = await prisma.objectCategories.findMany({
         orderBy: {
            category: 'asc',
         },
      });

      const categoriesNamesArr = categoriesArr.map(category => category.category)

      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

      const message: Message = {
         message: categoriesNamesArr,
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };
      // const message: Message = {
      //    message: postersArr,
      // };
      res.json(message);
      return;


      // try {
      //    const posterId = parseInt(req.params.id);
      //    const poster = await prisma.posters.findUnique({
      //       where: {
      //          id: posterId,
      //       },
      //    });

      //    res.json(poster);
      //    return;
      // } catch (error) {
      //    console.error('Ошибка получения объявления:', error);
      //    const message: Message = {
      //       error: 'Произошла ошибка при получении объявления',
      //    };
      //    res.status(500).json(message);
      //    return;
      // }
   }
   async getAllPosterDeleteReasons(req: Request, res: Response) {
      // const role = req.payload?.payload?.role;

      const posterDeleteReasonsArr: {
         id: number;
         reason: string;
      }[] = await prisma.posterDeleteReasons.findMany();

      const posterDeleteReasonsNamesArr = posterDeleteReasonsArr.map(reason => reason.reason)

      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

      const message: Message = {
         message: posterDeleteReasonsNamesArr,
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };

      res.json(message);
      return;
   }

   async getAllPosterStatuses(req: Request, res: Response) {

      const posterStatuses: {
         id: number;
         statusName: string;
      }[] = await prisma.posterStatuses.findMany();

      const posterStatusNamesArr = posterStatuses.map(posterStatus => posterStatus.statusName)

      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

      const message: Message = {
         message: posterStatusNamesArr,
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };

      res.json(message);
      return;
   }

   async createPoster(req: Request, res: Response) {
      console.log('--req.body', req.body);
      // console.log('--req.file', req.file);
      // console.log('--req.files', req.files);
      // res.json({ message: "Successfully uploaded files" });
      // return
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
            if (req.payload?.payload.role === roles.user) {
               //! код, кот. сейчас далее - только юзеры могут создать
               // ! UI валидация
               // !const userEmail = req.payload?.payload?.email;
               const userEmail = req.payload?.payload?.email;
               const userId = req.payload?.payload?.id || 2;
               console.log("🚀 ~ file: PosterController.ts:159 ~ PosterController ~ createPoster ~ userId:", userId)
               console.log("🚀 ~ file: PosterController.ts:22 ~ PosterController ~ createPoster ~ userEmail:", userEmail)
               // const today = getDateToday();
               // console.log(today);

               // ! objectStatus на UI: потеряно, найдено
               // publishDate не во время создания, а в update от админа
               // ! address - API Яндекс.Карты, присвоение квартала всем адресам?
               const { item, breed, isPet, objectCategory, description, itemStatus, dateOfAction, address, phone, coord0, coord1 } = req.body;

               const objectCategoryFull = await prisma.objectCategories.findFirst({
                  where: {
                     category: objectCategory,
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:35 ~ PosterController ~ createPoster ~ objectCategoryFull:", objectCategoryFull)

               // при создании - ожидает публикации
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.waitPublication,
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:43 ~ PosterController ~ createPoster ~ posterStatusFull:", posterStatusFull)

               let filename;
               if (!req.file) {
                  filename = 'nophoto.jpg';
               }
               else {
                  filename = req.file.filename;
                  console.log("🚀for uploaded ~ file: PosterController.ts:43 ~ PosterController ~ createPoster ~ filename:", filename)
               }
               console.log("🚀 ~ file: PosterController.ts:46 ~ PosterController ~ createPoster ~ filename:", filename)

               if (isPet) {
                  const createdPoster = await prisma.posters.create({
                     data: {
                        userId,
                        // userEmail,
                        posterStatusId: posterStatusFull?.id,
                        item,
                        breed,
                        isPet: true,
                        itemCategoryId: objectCategoryFull?.id,
                        description,
                        itemStatus,
                        dateOfAction: new Date(dateOfAction),
                        // publishDate: new Date(publishDate),
                        photoLink: filename,
                        coord0,
                        coord1,
                        address,
                        phone,
                     },
                  });
                  console.log("🚀 pet ~ file: PosterController.ts:46 ~ PosterController ~ createPoster ~ createdPoster:", createdPoster)
               }
               else {
                  const createdPoster = await prisma.posters.create({
                     data: {
                        userId,
                        // userEmail,
                        posterStatusId: posterStatusFull?.id,
                        item,
                        isPet: false,
                        itemCategoryId: objectCategoryFull?.id,
                        description,
                        itemStatus,
                        dateOfAction: new Date(dateOfAction),
                        // publishDate,
                        photoLink: filename,
                        coord0,
                        coord1,
                        address,
                        phone,
                     },
                  });
                  console.log("🚀 not pet ~ file: PosterController.ts:64 ~ PosterController ~ createPoster ~ createdPoster:", createdPoster)
               }

               // const message: Message = {
               //    message: 'Объявление отправлено на рассмотрение',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

               const message: Message = {
                  message: 'Объявление отправлено на рассмотрение',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(201).json(message);
               return;
            }
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  error: 'Создание объявления доступно только авторизованным пользователям',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(403).json(message);
               return;
            }

         }
         catch (error) {
            console.error('Ошибка создания объявления:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при создании объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            const message: Message = {
               error: 'Произошла ошибка при создании объявления',
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


   async getPosterById(req: Request, res: Response) {
      try {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const posterId = parseInt(req.params.id);
         if (isNaN(posterId)) {
            const message: Message = {
               error: `Объявление не найдено`,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(404).json(message);
            return;
         }
         const poster: PosterWithReasons | null = await prisma.posters.findUnique({
            where: {
               id: posterId,
            },
            include: {
               ObjectCategories: {
                  select: {
                     category: true,
                  },
               },
               PosterStatuses: {
                  select: {
                     statusName: true
                  }
               },
               DeletedPostersAndReasons: {
                  include: {
                     PosterDeleteReasons: {
                        select: {
                           reason: true
                        }
                     }
                  }
               },
               UnpublishedPostersAnswers: {
                  select: {
                     description: true
                  }
               }
            },
         });
         const currentUserId = req.payload?.payload?.id

         if (isNotAdmin && poster && poster.userId !== currentUserId && poster.PosterStatuses?.statusName !== posterStatuses.published) {
            const message: Message = {
               error: `Доступ запрещён`,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(403).json(message);
            return;
         }
         if (!poster) {
            const message: Message = {
               error: `Объявление не найдено`,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(404).json(message);
            return;
         }
         if (poster !== null) {
            const dtAct = formatDate(new Date(poster.dateOfAction))
            poster.dateOfAction = dtAct;

            if (poster.publishDate && poster.publishDate !== null) {
               const dtPub = formatDate(new Date(poster.publishDate))
               poster.publishDate = dtPub;
            }
         }
         const message: Message = {
            message: poster,
            rejectReason: poster.UnpublishedPostersAnswers[0]?.description || '',
            deleteReason: poster.DeletedPostersAndReasons[0]?.PosterDeleteReasons?.reason || '',
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message);
         return;
      } catch (error) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            error: 'Произошла ошибка при получении объявления',
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(500).json(message);
         return;
      }
   }

   async getCurrentUserPosters(req: Request, res: Response) {
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
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

         if (!isNotAdmin) {
            const message: Message = {
               error: 'У администраторов нет объявлений',
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.status(403).json(message);
            return;
         }
         // свои объявления доступны только зарегистрированным пользователям
         else if (req.payload?.payload?.role !== roles.user) {
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

         try {
            const currentUserId = req.payload?.payload?.id;

            const userPostersArr: Poster[] = await prisma.posters.findMany({
               where: {
                  userId: currentUserId,
               },
               include: {
                  ObjectCategories: {
                     select: {
                        category: true,
                     },
                  },
                  PosterStatuses: {
                     select: {
                        statusName: true
                     }
                  },
               },
            });

            if (userPostersArr.length !== 0 && userPostersArr !== null) {
               userPostersArr.map(poster => {
                  const dtAct = formatDate(new Date(poster.dateOfAction))
                  poster.dateOfAction = dtAct;

                  if (poster.publishDate && poster.publishDate !== null) {
                     const dtPub = formatDate(new Date(poster.publishDate))
                     poster.publishDate = dtPub;
                  }

                  return poster
               })

               // const dtAct = formatDate(new Date(poster.dateOfAction))
               // poster.dateOfAction = dtAct;

               // if (poster.publishDate && poster.publishDate !== null) {
               //    const dtPub = formatDate(new Date(poster.publishDate))
               //    poster.publishDate = dtPub;
               // }

               // if (poster.itemCategoryId !== null) {
               //    const categoriesArr = await prisma.posters.findUnique({
               //       where: {
               //          id: poster.itemCategoryId,
               //       },
               //    });
               // }

            }

            if (!userPostersArr || userPostersArr.length === 0 || userPostersArr === null) {
               const message: Message = {
                  error: `Объявления не найдены. Возможно, вы их ещё не создали`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            // const message: Message = {
            //    message: poster,
            // };

            const message: Message = {
               message: userPostersArr,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.json(message);
            return;

         }
         catch (error) {
            console.error('Ошибка получения объявления:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при получении объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            const message: Message = {
               error: 'Произошла ошибка при получении объявления',
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

   async updatePosterStatus(req: Request, res: Response) {  // обновление с персональной страницы Объявления

      console.log('-------------------------start updatePosterStatus--------------------------------------------------------')
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

            const role = req.payload?.payload?.role;
            console.log("🚀 ~ file: PosterController.ts:214 ~ PosterController ~ updatePoster ~ role:", role)
            // const posterIdNum = parseInt(req.params.id);
            // console.log("🚀 ~ file: PosterController.ts:672 ~ updatePosterStatus ~ posterIdNum:", posterIdNum)



            const today: Date = getDateToday();
            console.log(today);

            if (role === roles.admin) {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const { posterId, posterStatus, reason } = req.body;
               // const posterIdNum = parseInt(req.params.id);
               const posterIdNum = parseInt(posterId);
               if (isNaN(posterIdNum)) {

                  const message: Message = {
                     error: `Объявление не найдено`,
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  res.status(404).json(message);
                  return;
               }
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatus,
                  },
               });

               // кнопка Опубликовать
               if (posterStatus === posterStatuses.published) {
                  const updatedPoster = await prisma.posters.update({
                     where: {
                        id: posterIdNum,
                     },
                     data: {
                        publishDate: today,
                        posterStatusId: posterStatusFull?.id
                     },
                  });
                  console.log("🚀 ~ file: PosterController.ts:223 ~ PosterController ~ updatePoster ~ updatedPoster:", updatedPoster)
               }
               else {// кнопка Отклонить
                  console.log("🚀 ~ file: PosterController.ts:222 ~ PosterController ~ updatePoster ~ reason:", reason)
                  const updatedPoster = await prisma.posters.update({
                     where: {
                        id: posterIdNum,
                     },
                     data: {
                        posterStatusId: posterStatusFull?.id
                     },
                  });

                  const createUnpublishedPosterAnswer = await prisma.unpublishedPostersAnswers.create({
                     data: {
                        posterId: posterIdNum,
                        description: reason
                     },
                  });

                  console.log("🚀 ~ file: PosterController.ts:223 ~ PosterController ~ updatePoster ~ updatedPoster:", updatedPoster)
                  console.log("🚀 ~ file: PosterController.ts:264 ~ PosterController ~ updatePoster ~ createUnpublishedPosterAnswer:", createUnpublishedPosterAnswer)
               }

               // const message: Message = {
               //    message: 'Объявление успешно изменено',
               // };
               // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: 'Объявление успешно изменено',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               console.log('-------------------------end updatePosterStatus--------------------------------------------------------')
               return;

            }
            else {
               // const message: Message = {
               //    error: errors.forbidAccess + ' - отобразить на отдельной странице',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  error: errors.forbidAccess,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(403).json(message);
               console.log('-------------------------end else updatePosterStatus--------------------------------------------------------')
               return;
            }

         } catch (error) {
            console.error('Ошибка обновления объявления:', error);

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при обновлении объявления',
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

   async updatePoster(req: Request, res: Response) {  // обновление from user
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
            // console.log('--req.body', req.body);
            // console.log('--req.file', req.file);
            // res.json({ message: "Successfully uploaded files" });
            // return
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const role = req.payload?.payload?.role;
            console.log("🚀 ~ file: PosterController.ts:214 ~ PosterController ~ updatePoster ~ role:", role)
            const posterId = req.params.id;
            // ! objectStatus на UI: потеряно, найдено
            // publishDate не во время создания, а в update от админа
            // ! address - API Яндекс.Карты, присвоение квартала всем адресам?
            const { item, breed, isPet, objectCategory, description, itemStatus, dateOfAction, address, phone } = req.body;
            console.log("🚀 ~ file: PosterController.ts:298 ~ PosterController ~ updatePoster ~ req.body:", req.body)
            const posterIdNum = parseInt(posterId);

            if (isNaN(posterIdNum)) {
               console.log("🚀 ~ file: UserController.ts:135 ~ getOne ~ isNaN")

               const message: Message = {
                  error: `Объявление с id ${req.params.id} не найдено`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            // ! UI валидация
            // !const userEmail = req.payload?.payload?.email;
            const userEmail = req.payload?.payload?.email;
            const userId = req.payload?.payload?.id;
            console.log("🚀 ~ file: PosterController.ts:22 ~ PosterController ~ createPoster ~ userEmail:", userEmail)

            const posterFull = await prisma.posters.findUnique({
               where: {
                  id: posterIdNum,
               },
            });

            // меняет объявления только юзер и только свои
            if (role === roles.user && posterFull?.userId === userId) {

               let objectCategoryFull;
               if (objectCategory) {
                  objectCategoryFull = await prisma.objectCategories.findFirst({
                     where: {
                        category: objectCategory,
                     },
                  });
               }

               console.log("🚀 ~ file: PosterController.ts:35 ~ PosterController ~ createPoster ~ objectCategoryFull:", objectCategoryFull)

               // при изменении - ожидает публикации
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.waitPublication,
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:43 ~ PosterController ~ createPoster ~ posterStatusFull:", posterStatusFull)

               // если нет файла, то оставить фото
               // ! удалить старое фото (если не nophoto.jpg) до изменения имени файла в бд на новое
               let filename;
               if (req.file) {
                  if (posterFull?.photoLink !== 'nophoto.jpg') {
                     const pathToSrcDir = path.resolve(__dirname, '..');
                     const pathIntoUploadsDir = path.join(pathToSrcDir, 'uploads/');
                     const filePath = pathIntoUploadsDir + posterFull?.photoLink;
                     console.log("🚀 ~ file: PosterController.ts:349 ~ PosterController ~ updatePoster ~ filePath:", filePath)
                     if (fs.existsSync(filePath)) {
                        // Удаляем файл
                        fs.unlink(filePath, (err) => {
                           if (err) {
                              console.error('Ошибка при удалении файла:', err);
                              return;
                           }
                           console.log('Файл успешно удален');
                        });
                     }
                  }

                  filename = req.file.filename;
                  console.log("🚀for uploaded ~ file: PosterController.ts:43 ~ PosterController ~ updatePoster ~ filename:", filename)
               }
               console.log("🚀 ~ file: PosterController.ts:46 ~ PosterController ~ updatePoster ~ filename:", filename)

               if (posterFull?.isPet) {
                  const updatedPoster = await prisma.posters.update({
                     where: {
                        id: posterIdNum
                     },
                     data: {
                        // userEmail,
                        posterStatusId: posterStatusFull?.id,
                        // item: item ? item : undefined,
                        breed: breed ? breed : undefined,
                        // isPet: true,
                        itemCategoryId: objectCategoryFull ? objectCategoryFull.id : undefined,
                        description: description ? description : undefined,
                        // itemStatus: itemStatus ? itemStatus : undefined,
                        // dateOfAction: dateOfAction ? new Date(dateOfAction) : undefined,
                        // publishDate: null,
                        photoLink: filename ? filename : undefined,
                        address: address ? address : undefined,
                        phone: phone ? phone : undefined,
                     },
                  });
                  console.log("🚀 pet ~ file: PosterController.ts:46 ~ PosterController ~ updatePoster ~ updatedPoster:", updatedPoster)
               }
               else {
                  const updatedPoster = await prisma.posters.update({
                     where: {
                        id: posterIdNum
                     },
                     data: {
                        // userEmail,
                        posterStatusId: posterStatusFull?.id,
                        // item: item ? item : undefined,
                        // isPet: false,
                        itemCategoryId: objectCategoryFull ? objectCategoryFull.id : undefined,
                        description: description ? description : undefined,
                        // itemStatus: itemStatus ? itemStatus : undefined,
                        // dateOfAction: dateOfAction ? new Date(dateOfAction) : undefined,
                        // publishDate: null,
                        photoLink: filename ? filename : undefined,
                        address: address ? address : undefined,
                        phone: phone ? phone : undefined,
                     },
                  });
                  console.log("🚀 not pet ~ file: PosterController.ts:64 ~ PosterController ~ updatePoster ~ updatedPoster:", updatedPoster)
               }

               // const message: Message = {
               //    message: 'Изменения отправлены на рассмотрение',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: 'Изменения отправлены на рассмотрение',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(201).json(message);
               return;
            }
            else {
               // const message: Message = {
               //    error: errors.forbidAccess + ' - отобразить на отдельной странице',
               // };
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


         } catch (error) {
            console.error('Ошибка обновления объявления:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при обновлении объявления',
            // };

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при обновлении объявления',
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

   async deletePoster(req: Request, res: Response) {
      // ! кнопка удаления у админа доступна только в статусе Ожидание удаления
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
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const role = req.payload?.payload?.role;
            const userId = req.payload?.payload?.id;
            console.log("🚀 ~ file: PosterController.ts:214 ~ PosterController ~ updatePoster ~ role:", role)

            const { posterId, reason } = req.body;
            console.log("🚀 ~ file: PosterController.ts:298 ~ PosterController ~ updatePoster ~ req.body:", req.body)

            const posterIdNum = parseInt(posterId);

            if (isNaN(posterIdNum)) {
               console.log("🚀 ~ file: UserController.ts:135 ~ getOne ~ isNaN")

               const message: Message = {
                  error: `Объявление с id ${posterId} не найдено`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            const posterToUpdate = await prisma.posters.findUnique({
               where: {
                  id: posterIdNum,
               },
               include: {
                  ObjectCategories: {
                     select: {
                        category: true,
                     },
                  },
                  PosterStatuses: {
                     select: {
                        statusName: true
                     }
                  },
               },
            });

            // user: при удалении статус "ожидание удаления", удалить можно только свои объявления
            if (role === roles.user && userId === posterToUpdate?.userId
               && posterToUpdate?.PosterStatuses?.statusName !== posterStatuses.waitDelete
               && posterToUpdate?.PosterStatuses?.statusName !== posterStatuses.deleted) {
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.waitDelete,
                  },
               });

               // статус "ожидание удаления"
               const updatedPoster = await prisma.posters.update({
                  where: {
                     id: posterIdNum,
                  },
                  data: {
                     posterStatusId: posterStatusFull?.id
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:463 ~ PosterController ~ deletePoster ~ updatedPoster:", updatedPoster)
               // const message: Message = {
               //    message: 'Запрос отправлен на рассмотрение',
               // };

               const posterDeleteReasonsFull = await prisma.posterDeleteReasons.findFirst({
                  where: {
                     reason: reason,
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:262 ~ PosterController ~ updatePoster ~ posterDeleteReasonsFull:", posterDeleteReasonsFull)

               // установить причину в отдельную таблицу
               const createDeletePosterReason = await prisma.deletedPostersAndReasons.create({
                  data: {
                     posterId: posterIdNum,
                     deleteReasonId: posterDeleteReasonsFull?.id
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:470 ~ PosterController ~ deletePoster ~ createDeletePosterReason:", createDeletePosterReason)


               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: 'Запрос отправлен на рассмотрение',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               return;
            }
            // admin: при удалении статус "удалено"
            else if (role === roles.admin && posterToUpdate?.PosterStatuses?.statusName === posterStatuses.waitDelete || posterToUpdate?.PosterStatuses?.statusName === posterStatuses.waitPublication) {
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.deleted,
                  },
               });

               const updatedPoster = await prisma.posters.update({
                  where: {
                     id: posterIdNum,
                  },
                  data: {
                     posterStatusId: posterStatusFull?.id
                  },
               });
               console.log("🚀 ~ file: PosterController.ts:487 ~ PosterController ~ deletePoster ~ updatedPoster:", updatedPoster)

               if (posterToUpdate?.PosterStatuses?.statusName === posterStatuses.waitPublication) {
                  const posterDeleteReasonsFull = await prisma.posterDeleteReasons.findFirst({
                     where: {
                        reason: 'другая причина',
                     },
                  });

                  // установить причину в отдельную таблицу
                  const createDeletePosterReason = await prisma.deletedPostersAndReasons.create({
                     data: {
                        posterId: posterIdNum,
                        deleteReasonId: posterDeleteReasonsFull?.id
                     },
                  });
               }
               // const message: Message = {
               //    message: 'Объявление успешно удалено',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: 'Объявление успешно удалено',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               return;
            }
            // остальным запрещено удалять
            else {
               // const message: Message = {
               //    error: errors.forbidAccess + ' - отобразить на отдельной странице',
               // };
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

         } catch (error) {
            console.error('Ошибка удаления объявления:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при удалении объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при удалении объявления',
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

export default new PosterController();

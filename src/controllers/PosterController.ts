import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Message, Poster, PosterWaitForUpdateApprove, PosterWaitForUpdateApproveShort, PosterWithReasons, PosterWithReasonsPossiblyUndef, UpdateData } from '../utils/types';
import * as fs from 'fs';
import { errors, posterDeleteReasons, posterStatuses, roles } from '../utils/commonVars';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Используем для генерации уникального имени файла
import { formatDate, getDateTimeNow, getDateToday, returnErrorMessage, returnOkMessage } from '../utils/commonFunctions';
import { createClient } from 'webdav';

// const client = createClient(process.env.WEBDAV_REMOTE_URL || "", { username: process.env.WEBDAV_USERNAME, password: process.env.WEBDAV_PASSWORD, });

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
   async getPhoto(req: Request, res: Response) {
      try {
         const remotePath = `/uploads/${encodeURIComponent(req.params.filename)}`;
         const { createClient } = await import("webdav");
         const client = createClient(process.env.WEBDAV_REMOTE_URL || "", { username: process.env.WEBDAV_USERNAME, password: process.env.WEBDAV_PASSWORD, });

         const exists = await client.exists(remotePath);
         if (!exists) {
            console.warn(`Файл ${remotePath} не найден`);
         }
         const stream = !exists ? client.createReadStream('/uploads/nophoto.jpg') : client.createReadStream(remotePath);
         stream.pipe(res);

      } catch (err) {
         console.error("Ошибка getPhoto from YaDisk webdav:", err);
         res.status(404).send("Файл не найден");
      }
   }

   async getAllPosters(req: Request, res: Response) {
      const role = req.payload?.payload?.role;
      if (role === roles.admin) {   // админ видит все, (кроме имеющих статус Удалено - нет, пока абосолютно все), в убывающем порядке нумерации по id (от последнего к первому)
         const posterStatusFullDeleted = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.deleted
            }
         });
         const posterStatusFullRejected = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.rejected
            }
         });
         const posterStatusFullUpdRejected = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.updateRejected
            }
         });
         const posterStatusFullUpdated = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.updated
            }
         });
         let excludeArr: number[] = []
         if (posterStatusFullDeleted && posterStatusFullRejected) {
            excludeArr = [posterStatusFullDeleted.id, posterStatusFullRejected.id]
         }
         const postersArr: Poster[] = await prisma.posters.findMany({
            where: {
               posterStatusId: {
                  notIn: excludeArr,
               }
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
               id: 'desc',
            },
         });
         const postersWaitForUpdateApproveArr: Poster[] = await prisma.postersWaitForUpdateApprove.findMany({

            where: {
               posterStatusId: posterStatusFullUpdated?.id
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
            }
         });
         let postersArrWithUpdReplace: Poster[] = []
         if (postersArr.length !== 0 && postersArr !== null) {
            postersArrWithUpdReplace = postersArr.map(poster => {
               let posterToReturn: Poster
               const findUpdates: Poster | undefined = postersWaitForUpdateApproveArr.find(posterNew => poster.id === posterNew.id)
               if (findUpdates)
                  posterToReturn = findUpdates
               else
                  posterToReturn = poster
               return posterToReturn
            })
         }
         if (postersArrWithUpdReplace.length !== 0 && postersArrWithUpdReplace !== null) {
            postersArrWithUpdReplace.map(poster => {
               const dtAct = formatDate(new Date(poster.dateOfAction))
               poster.dateOfAction = dtAct;

               if (poster.publishDate && poster.publishDate !== null) {
                  const dtPub = formatDate(new Date(poster.publishDate))
                  poster.publishDate = dtPub;
               }

               return poster
            })
         }
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnOkMessage(isAuth, isNotAdmin, postersArrWithUpdReplace)
         res.json(message);
         return;
      }
      else {   // все, кроме админа, видят только со статусом Опубликовано, в порядке убывания даты публикации
         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatuses.published
            }
         });
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
         const message: Message = returnOkMessage(isAuth, isNotAdmin, postersArr)
         res.json(message);
         return;
      }
   }
   async getAllPostersFiltered(req: Request, res: Response) {
      const role = req.payload?.payload?.role;
      const { posterStatusName, isPet, objectCategory, description, itemStatus, dateOfAction, address, phone } = req.body;
      if (role === roles.admin) {
         const posterStatusFull = await prisma.posterStatuses.findFirst({
            where: {
               statusName: posterStatusName
            }
         });
         let postersArr: Poster[]
         if (posterStatusName === posterStatuses.updated) {
            postersArr = await prisma.postersWaitForUpdateApprove.findMany({
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
            })
         }
         else {
            postersArr = await prisma.posters.findMany({
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
         }
         postersArr.length !== 0 && postersArr.map(poster => {
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
         res.json(message);
         return;
      }
      else {
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
         res.json(message);
         return;
      }
   }
   async getAllCategories(req: Request, res: Response) {
      const categoriesArr: {
         id: number;
         category: string;
         isPet: boolean
      }[] = await prisma.objectCategories.findMany({
         orderBy: {
            category: 'asc',
         },
      });
      const categoriesNamesArr = categoriesArr.map(category => category.category)
      const petCategories = categoriesArr.filter(category => category.isPet)
      const petCategoriesNames = petCategories.map(category => category.category)
      const itemCategories = categoriesArr.filter(category => !category.isPet)
      const itemCategoriesNames = itemCategories.map(category => category.category)
      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
      const message: Message = {
         message: { petCategories: petCategoriesNames, itemCategories: itemCategoriesNames },
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };
      res.json(message);
      return;
   }
   async getAllPosterDeleteReasons(req: Request, res: Response) {
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
      const posterStatusesDB: {
         id: number;
         statusName: string;
      }[] = await prisma.posterStatuses.findMany();
      const posterStatusNamesArr = posterStatusesDB.map(posterStatus => posterStatus.statusName)
      const posterStatusNamesArrFiltered = posterStatusNamesArr.filter((status) => {
         if (status === posterStatuses.deleted || status === posterStatuses.rejected || status === posterStatuses.updateRejected) {
            return
         }
         return status
      })
      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
      const message: Message = {
         message: posterStatusNamesArrFiltered,
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };
      res.json(message);
      return;
   }

   async createPoster(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         try {
            if (req.payload?.payload.role === roles.user) {
               const userEmail = req.payload?.payload?.email;
               const userId = req.payload?.payload?.id;
               const { item, breed, isPet, objectCategory, description, itemStatus, dateOfAction, address, phone, coord0, coord1 } = req.body;
               const objectCategoryFull = await prisma.objectCategories.findFirst({
                  where: {
                     category: objectCategory,
                  },
               });
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.waitPublication,
                  },
               });
               let filename;
               if (!req.file) {
                  filename = 'nophoto.jpg';
               }
               else {
                  filename = `${uuidv4()}${path.extname(req.file.originalname)}`; // Генерируем уникальное имя файла
                  try {
                     const { createClient } = await import("webdav");
                     const client = createClient(process.env.WEBDAV_REMOTE_URL || "", { username: process.env.WEBDAV_USERNAME, password: process.env.WEBDAV_PASSWORD, });
                     // overwrite - перезаписать файлы с одинаковыми именами, иначе - ошибка
                     await client.putFileContents('/uploads/' + filename, req.file.buffer, { overwrite: true });
                  } catch (error) {
                     console.error('Ошибка загрузки файла webdav: ', error);
                  }
               }
               if (isPet) {
                  const createdPoster = await prisma.posters.create({
                     data: {
                        userId,
                        posterStatusId: posterStatusFull?.id,
                        item,
                        breed,
                        isPet: true,
                        itemCategoryId: objectCategoryFull?.id,
                        description,
                        itemStatus,
                        dateOfAction: new Date(dateOfAction),
                        photoLink: filename,
                        coord0,
                        coord1,
                        address,
                        phone,
                     },
                  });
               }
               else {
                  const createdPoster = await prisma.posters.create({
                     data: {
                        userId,
                        posterStatusId: posterStatusFull?.id,
                        item,
                        isPet: false,
                        itemCategoryId: objectCategoryFull?.id,
                        description,
                        itemStatus,
                        dateOfAction: new Date(dateOfAction),
                        photoLink: filename,
                        coord0,
                        coord1,
                        address,
                        phone,
                     },
                  });
               }
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
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Создание объявления доступно только авторизованным пользователям')
               res.status(403).json(message);
               return;
            }
         }
         catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при создании объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
   async getPosterById(req: Request, res: Response) {
      try {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const posterId = parseInt(req.params.id);
         const isUpdated = req.query.updated
         if (isNaN(posterId)) {
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Объявление не найдено')
            res.status(404).json(message);
            return;
         }

         const currentUserId = req.payload?.payload?.id
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
               ,
               Users: {
                  select: {
                     name: true,
                     email: true
                  }
               }
            },
         });
         if (isNotAdmin && poster && poster.userId !== currentUserId && poster.PosterStatuses?.statusName !== posterStatuses.published) {
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
            res.status(403).json(message);
            return;
         }
         if (!poster) {
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Объявление не найдено')
            res.status(404).json(message);
            return;
         }
         let posterWFU: PosterWithReasonsPossiblyUndef | null | undefined
         posterWFU = await prisma.postersWaitForUpdateApprove.findUnique({
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
               Users: {
                  select: {
                     name: true,
                     email: true
                  }
               }
            },
         });
         if (!isNotAdmin || (currentUserId === poster.userId && isUpdated === 'true')) {
            // posterWFU = await prisma.postersWaitForUpdateApprove.findUnique({
            //    where: {
            //       id: posterId,
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
            //       Users: {
            //          select: {
            //             name: true,
            //             email: true
            //          }
            //       }
            //    },
            // });
            if (posterWFU && posterWFU.PosterStatuses?.statusName === posterStatuses.updated) {
               posterWFU.DeletedPostersAndReasons = []
               posterWFU.UnpublishedPostersAnswers = []
               const dtAct = formatDate(new Date(posterWFU.dateOfAction))
               posterWFU.dateOfAction = dtAct;
               if (posterWFU.publishDate && posterWFU.publishDate !== null) {
                  const dtPub = formatDate(new Date(posterWFU.publishDate))
                  posterWFU.publishDate = dtPub;
               }
               const messageWFU: Message = {
                  message: posterWFU,
                  rejectReason: '',
                  deleteReason: '',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(messageWFU);
               return;
            }
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
            rejectUpdMessage: (posterWFU && posterWFU.PosterStatuses?.statusName === posterStatuses.updateRejected) ? posterStatuses.updateRejected : '',
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         console.log("🚀 ~ PosterController ~ getPosterById ~ posterWFU.PosterStatuses?.statusName:", posterWFU)
         console.log("🚀 ~ PosterController ~ getPosterById ~ rejectUpdMessage:", message.rejectUpdMessage)
         res.json(message);
         return;
      } catch (error) {
         console.log("🚀 ~ getPosterById ~ error:", error)
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при получении объявления')
         res.status(500).json(message);
         return;
      }
   }
   async getNotifications(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: [],
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.json(message)
         return;
      }
      else {
         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const posterId = parseInt(req.params.id);
            const currentUserId = req.payload?.payload?.id
            const postersArr = await prisma.posters.findMany({
               where: {
                  AND: {
                     userId: currentUserId,
                     PosterComments: {
                        some: {
                           readByPosterAuthor: false
                        }
                     },
                     PosterStatuses: {
                        is: {
                           statusName: 'опубликовано'
                        }
                     }
                  }
               },
            });
            const notificationsInfo = postersArr.map(poster => {
               return { posterId: poster.id, posterItem: poster.item }
            })
            const message: Message = {
               message: notificationsInfo,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.json(message);
            return;
         } catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при получении уведомлений')
            res.status(500).json(message);
            return;
         }
      }
   }
   async getCurrentUserPosters(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         if (!isNotAdmin) {
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'У администраторов нет объявлений')
            res.status(403).json(message);
            return;
         }
         else if (req.payload?.payload?.role !== roles.user) {
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
            res.status(403).json(message);
            return;
         }
         try {
            const currentUserId = req.payload?.payload?.id;
            const posterStatusFullUpdated = await prisma.posterStatuses.findFirst({
               where: {
                  statusName: posterStatuses.updated
               }
            })
            const posterStatusFullDeleted = await prisma.posterStatuses.findFirst({
               where: {
                  statusName: posterStatuses.deleted
               }
            })
            const userPostersArr: Poster[] = await prisma.posters.findMany({
               where: {
                  userId: currentUserId,
                  NOT: {
                     posterStatusId: posterStatusFullDeleted?.id
                  }
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
                  dateOfAction: 'desc'
               }
            });
            const userPostersWaitForUpdateApproveArr: Poster[] = await prisma.postersWaitForUpdateApprove.findMany({
               where: {
                  AND: {
                     userId: currentUserId,
                     posterStatusId: posterStatusFullUpdated?.id
                  }
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
               }
            });
            let userPostersArrWithUpdReplace: Poster[] = []
            if (userPostersArr.length !== 0 && userPostersArr !== null) {
               userPostersArrWithUpdReplace = userPostersArr.map(poster => {
                  let posterToReturn: Poster
                  const findUpdates: Poster | undefined = userPostersWaitForUpdateApproveArr.find(posterNew => poster.id === posterNew.id)
                  if (findUpdates) {
                     posterToReturn = findUpdates
                  }
                  else
                     posterToReturn = poster
                  return posterToReturn
               })
            }
            if (userPostersArrWithUpdReplace.length !== 0 && userPostersArrWithUpdReplace !== null) {
               userPostersArrWithUpdReplace.map(poster => {
                  const dtAct = formatDate(new Date(poster.dateOfAction))
                  poster.dateOfAction = dtAct;
                  if (poster.publishDate && poster.publishDate !== null) {
                     const dtPub = formatDate(new Date(poster.publishDate))
                     poster.publishDate = dtPub;
                  }
                  return poster
               })
            }
            if (!userPostersArrWithUpdReplace || userPostersArrWithUpdReplace.length === 0 || userPostersArrWithUpdReplace === null) {
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Объявления не найдены. Возможно, вы их ещё не создали')
               res.status(404).json(message);
               return;
            }
            const message: Message = {
               message: userPostersArrWithUpdReplace,
               accountInfo: {
                  isAuth: isAuth,
                  isNotAdmin: isNotAdmin,
               }
            };
            res.json(message);
            return;

         }
         catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при получении объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
   async updatePosterStatus(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         try {
            const role = req.payload?.payload?.role;
            const today: Date = getDateTimeNow();
            if (role === roles.admin) {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const { posterId, posterStatus, reason } = req.body;
               const posterIdNum = parseInt(posterId);
               if (isNaN(posterIdNum)) {
                  const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Объявление не найдено')
                  res.status(404).json(message);
                  return;
               }
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatus,
                  },
               });
               if (posterStatus === posterStatuses.published) {
                  const posterF = await prisma.posters.findUnique({
                     where: {
                        id: posterIdNum
                     }
                  })
                  const updatedPoster = await prisma.posters.update({
                     where: {
                        id: posterIdNum,
                     },
                     data: {
                        publishDate: today,
                        posterStatusId: posterStatusFull?.id
                     },
                  });
               }
               else {
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
               }
               const message: Message = {
                  message: 'Объявление успешно изменено',
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
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
               res.status(403).json(message);
               return;
            }

         } catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при обновлении объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
   async decidePosterUpdate(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         try {
            const role = req.payload?.payload?.role;
            const today: Date = getDateTimeNow();
            if (role === roles.admin) {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const { posterId, posterStatus } = req.body;
               const posterIdNum = parseInt(posterId);
               if (isNaN(posterIdNum)) {
                  const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Объявление не найдено')
                  res.status(404).json(message);
                  return;
               }
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatus,
                  },
               });
               if (posterStatus === posterStatuses.published) {
                  const posterWithNewInfo: PosterWaitForUpdateApproveShort | null = await prisma.postersWaitForUpdateApprove.findUnique({
                     where: {
                        id: posterIdNum
                     }
                  })
                  if (posterWithNewInfo && posterWithNewInfo !== null) {
                     const { breed, itemCategoryId, description, photoLink, address, phone, coord0, coord1 } = posterWithNewInfo
                     const updatedPoster = await prisma.posters.update({
                        where: {
                           id: posterIdNum,
                        },
                        data: {
                           publishDate: today,
                           posterStatusId: posterStatusFull?.id,
                           breed: breed ? breed : undefined,
                           itemCategoryId: itemCategoryId ? itemCategoryId : undefined,
                           description: description ? description : undefined,
                           photoLink: photoLink ? photoLink : undefined,
                           address: address ? address : undefined,
                           phone: phone ? phone : undefined,
                           coord0: coord0 ? coord0 : undefined,
                           coord1: coord1 ? coord1 : undefined,
                        },
                     });
                     if (updatedPoster && updatedPoster !== null) {
                        const deletedRowFromApprovementTable = await prisma.postersWaitForUpdateApprove.delete({
                           where: {
                              id: posterIdNum,
                           },
                        })
                     }
                     const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
                     const message: Message = {
                        message: 'изменения сохранены',
                        accountInfo: {
                           isAuth: isAuth,
                           isNotAdmin: isNotAdmin,
                        }
                     };
                     res.status(200).json(message);
                     return;
                  }
                  else {
                     const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
                     const message: Message = {
                        message: 'Объявление не найдено',
                        accountInfo: {
                           isAuth: isAuth,
                           isNotAdmin: isNotAdmin,
                        }
                     };
                     res.status(404).json(message);
                     return;
                  }
               }
               else {
                  const updatedPoster = await prisma.postersWaitForUpdateApprove.update({
                     where: {
                        id: posterIdNum,
                     },
                     data: {
                        posterStatusId: posterStatusFull?.id
                     },
                  });
                  const posterToSend = await prisma.posters.findUnique({
                     where: {
                        id: posterIdNum,
                     }
                  });
                  const message: Message = {
                     message: 'изменения сохранены',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  res.status(201).json(message);
                  return;
               }
            }
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
               res.status(403).json(message);
               return;
            }
         } catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при обновлении объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
   async updatePoster(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const role = req.payload?.payload?.role;
            const posterId = req.params.id;
            const { breed, objectCategory, description, dateOfAction, address, phone, coord0, coord1 } = req.body;
            const posterIdNum = parseInt(posterId);

            if (isNaN(posterIdNum)) {
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, `Объявление с id ${req.params.id} не найдено`)
               res.status(404).json(message);
               return;
            }
            const userId = req.payload?.payload?.id;
            const posterFull = await prisma.posters.findUnique({
               where: {
                  id: posterIdNum,
               },
            });
            if (role === roles.user && posterFull?.userId === userId) {
               let objectCategoryFull;
               if (objectCategory) {
                  objectCategoryFull = await prisma.objectCategories.findFirst({
                     where: {
                        category: objectCategory,
                     },
                  });
               }
               const posterStatusFull = await prisma.posterStatuses.findFirst({
                  where: {
                     statusName: posterStatuses.updated,
                  },
               });
               let filename;
               if (req.file) {
                  filename = req.file.filename;
               }
               if (posterFull?.isPet) {
                  const posterWaitToUpd = await prisma.postersWaitForUpdateApprove.upsert({
                     where: {
                        id: posterIdNum,
                     },
                     create: {
                        id: posterIdNum,
                        userId: posterFull.userId,
                        posterStatusId: posterStatusFull?.id,
                        item: posterFull.item,
                        breed: breed ? breed : posterFull.breed,
                        isPet: posterFull.isPet,
                        itemCategoryId: objectCategoryFull ? objectCategoryFull.id : posterFull.itemCategoryId,
                        description: description ? description : posterFull.description,
                        itemStatus: posterFull.itemStatus,
                        dateOfAction: posterFull.dateOfAction,
                        publishDate: posterFull.publishDate,
                        photoLink: filename ? filename : posterFull.photoLink,
                        address: address ? address : posterFull.address,
                        phone: phone ? phone : posterFull.phone,
                        coord0: coord0 ? coord0 : posterFull.coord0,
                        coord1: coord1 ? coord1 : posterFull.coord1,
                     },
                     update: {
                        posterStatusId: posterStatusFull?.id,
                        breed: breed ? breed : undefined,
                        itemCategoryId: objectCategoryFull ? objectCategoryFull.id : undefined,
                        description: description ? description : undefined,
                        photoLink: filename ? filename : undefined,
                        address: address ? address : undefined,
                        phone: phone ? phone : undefined,
                        coord0: coord0 ? coord0 : undefined,
                        coord1: coord1 ? coord1 : undefined,
                     }
                  })
               }
               else {
                  if (posterFull) {
                     const posterWaitToUpd = await prisma.postersWaitForUpdateApprove.upsert({
                        where: {
                           id: posterIdNum,
                        },
                        create: {
                           id: posterIdNum,
                           userId: posterFull.userId,
                           posterStatusId: posterStatusFull?.id,
                           item: posterFull.item,
                           isPet: posterFull.isPet,
                           itemCategoryId: objectCategoryFull ? objectCategoryFull.id : posterFull.itemCategoryId,
                           description: description ? description : posterFull.description,
                           itemStatus: posterFull.itemStatus,
                           dateOfAction: posterFull.dateOfAction,
                           publishDate: posterFull.publishDate,
                           photoLink: filename ? filename : posterFull.photoLink,
                           address: address ? address : posterFull.address,
                           phone: phone ? phone : posterFull.phone,
                           coord0: coord0 ? coord0 : posterFull.coord0,
                           coord1: coord1 ? coord1 : posterFull.coord1,
                        },
                        update: {
                           posterStatusId: posterStatusFull?.id,
                           itemCategoryId: objectCategoryFull ? objectCategoryFull.id : undefined,
                           description: description ? description : undefined,
                           photoLink: filename ? filename : undefined,
                           address: address ? address : undefined,
                           phone: phone ? phone : undefined,
                           coord0: coord0 ? coord0 : undefined,
                           coord1: coord1 ? coord1 : undefined,
                        }
                     })
                  }
               }
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
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
               res.status(403).json(message);
               return;
            }

         } catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при обновлении объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
   async getStatistics(req: Request, res: Response) {
      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
      const reasonFoundFull = await prisma.posterDeleteReasons.findFirst({
         where: {
            reason: posterDeleteReasons.found
         }
      })
      const reasonNoHopeFull = await prisma.posterDeleteReasons.findFirst({
         where: {
            reason: posterDeleteReasons.noHope
         }
      })
      const deleteStatusFull = await prisma.posterStatuses.findFirst({
         where: {
            statusName: posterStatuses.deleted
         }
      })
      const publishedStatusFull = await prisma.posterStatuses.findFirst({
         where: {
            statusName: posterStatuses.published
         }
      })
      const countDeletedPosters = await prisma.posters.count({
         where: {
            posterStatusId: deleteStatusFull?.id
         }
      })
      const countDeletedFoundPosters = await prisma.deletedPostersAndReasons.count({
         where: {
            deleteReasonId: reasonFoundFull?.id
         }
      })
      const countPublishedPosters = await prisma.posters.count({
         where: {
            posterStatusId: publishedStatusFull?.id
         }
      })
      const foundPercent = (countDeletedFoundPosters / (countDeletedPosters + countPublishedPosters)) * 100
      const roundedFoundPercent = parseFloat(foundPercent.toFixed(2));
      const message: Message = {
         message: roundedFoundPercent,
         accountInfo: {
            isAuth: isAuth,
            isNotAdmin: isNotAdmin,
         }
      };
      res.status(200).json(message)
      return;
   }
   async deletePoster(req: Request, res: Response) {
      if (!req.payload) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.unAuthorized)
         res.status(401).json(message)
         return;
      }
      else {
         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const role = req.payload?.payload?.role;
            const userId = req.payload?.payload?.id;
            const { posterId, reason } = req.body;
            const posterIdNum = parseInt(posterId);
            if (isNaN(posterIdNum)) {
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, `Объявление с id ${posterId} не найдено`)
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
            if (role === roles.user && userId === posterToUpdate?.userId
            ) {
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
               const posterDeleteReasonsFull = await prisma.posterDeleteReasons.findFirst({
                  where: {
                     reason: reason,
                  },
               });
               const createDeletePosterReason = await prisma.deletedPostersAndReasons.create({
                  data: {
                     posterId: posterIdNum,
                     deleteReasonId: posterDeleteReasonsFull?.id
                  },
               });
               const findPosterToDelete = await prisma.postersWaitForUpdateApprove.findUnique({
                  where: {
                     id: posterIdNum,
                  },
               })
               if (findPosterToDelete && findPosterToDelete !== null) {
                  const deletedPosterUpdate = await prisma.postersWaitForUpdateApprove.delete({
                     where: {
                        id: posterIdNum,
                     },
                  });
               }
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
               if (posterToUpdate?.PosterStatuses?.statusName === posterStatuses.waitPublication) {
                  const posterDeleteReasonsFull = await prisma.posterDeleteReasons.findFirst({
                     where: {
                        reason: 'другая причина',
                     },
                  });
                  const createDeletePosterReason = await prisma.deletedPostersAndReasons.create({
                     data: {
                        posterId: posterIdNum,
                        deleteReasonId: posterDeleteReasonsFull?.id
                     },
                  });
               }
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
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = returnErrorMessage(isAuth, isNotAdmin, errors.forbidAccess)
               res.status(403).json(message);
               return;
            }

         } catch (error) {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = returnErrorMessage(isAuth, isNotAdmin, 'Произошла ошибка при удалении объявления')
            res.status(500).json(message);
            return;
         }
      }
   }
}
export default new PosterController();

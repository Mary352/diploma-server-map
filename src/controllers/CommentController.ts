import { Request, Response } from 'express';
import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import dotenv from 'dotenv';
dotenv.config();

import { User, Message, UserLogin, Comment } from '../utils/types';
import { errors, roles } from '../utils/commonVars';
import { getDateTimeNow, formatDateTime } from '../utils/commonFunctions';

import nodemailer, { Transporter } from 'nodemailer'

// const ACCESS_KEY = "ACCESS_KEY";
// const SALT_ROUNDS = 3;

// interface User {
//    email: string;
//    name: string;
//    password: string;
//    phone: string;
//    address: string;
//    role: string;
// }

function sendMailNotification(commentText: string, posterLink: string, posterTitle: string, userMail: string): void {
   console.log("---🚀 ~ sendMailNotification ~ sendMailNotification:")
   const transporter: Transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
         // user: 'buro.nahodok.ifind@gmail.com',
         // pass: 'yote mcal zqmt kqtl'
         user: process.env.EMAIL,
         pass: process.env.PASSWORD
      }
   })

   const baseText = `<p>Текст комментария: "${commentText}"</p> 
   <a href='${posterLink}'>Перейти к объявлению</a>`

   const mailText = posterTitle ? (`<p>Объявление: "${posterTitle}"</p> ` + baseText) : baseText

   const mailOptions = {
      from: process.env.EMAIL,
      to: 'testjava1515@gmail.com',
      // to: userMail ? userMail : 'testjava1515@gmail.com',
      subject: 'Новый комментарий к объявлению на сайте "Бюро находок"',
      // text: `${commentText} ${posterLink}`
      html: mailText
   }

   transporter.sendMail(mailOptions, err => {
      // if (err) {
      console.log(err)
      // }
   })

   console.log("---🚀 ~ sendMailNotification ~ sendMailNotification:")
}


function returnUserInfoToMakeDecisions(req: Request) {
   const isAuth = req.payload && req.payload.payload ? true : false
   const isNotAdmin = req.payload && req.payload.payload && req.payload.payload.role === 'admin' ? false : true
   console.log("🚀 ~ file: CommentController.ts:26 ~ returnUserInfoToMakeDecisions ~ req.payload:", req.payload)
   // const userLoginForLink = req.payload ? req.payload.login : '#'

   return {
      isAuth: isAuth,
      isNotAdmin: isNotAdmin,
      // userLoginForLink: userLoginForLink 
   }
}

async function getCommentsForPoster(posterId: number) {
   const commentsArr: Comment[] = await prisma.posterComments.findMany({
      where: {
         posterId: posterId
      },
      include: {
         Users: {
            select: {
               name: true,
            },
         },
      },
      orderBy: {
         creationDate: 'desc',
      },
   });

   commentsArr.map(comment => {
      const dtCreation = formatDateTime(new Date(comment.creationDate))
      comment.creationDate = dtCreation;

      // if (poster.publishDate && poster.publishDate !== null) {
      //    const dtPub = formatDate(new Date(poster.publishDate))
      //    poster.publishDate = dtPub;
      // }

      return comment
   })

   return commentsArr;
}

async function getAllComments() {
   const commentsArr: Comment[] = await prisma.posterComments.findMany({

      include: {
         Users: {
            select: {
               name: true,
            },
         },
      },
      orderBy: {
         complaintsCount: 'desc',
      },
   });

   commentsArr.map(comment => {
      const dtCreation = formatDateTime(new Date(comment.creationDate))
      comment.creationDate = dtCreation;

      return comment
   })

   return commentsArr;
}

async function getFirstBadCommentForPoster(posterId: number) {
   const comment: Comment | null = await prisma.posterComments.findFirst({
      where: {
         posterId: posterId,
         complaintsCount: {
            gt: 5
         }
      },
      include: {
         Users: {
            select: {
               name: true,
            },
         },
      },
   });
   console.log("🚀 ~ getFirstBadCommentForPoster ~ comment:", comment)

   if (comment) {
      const dtCreation = formatDateTime(new Date(comment.creationDate))
      comment.creationDate = dtCreation;
   }

   // commentsArr.map(comment => {
   //    const dtCreation = formatDateTime(new Date(comment.creationDate))
   //    comment.creationDate = dtCreation;

   //    // if (poster.publishDate && poster.publishDate !== null) {
   //    //    const dtPub = formatDate(new Date(poster.publishDate))
   //    //    poster.publishDate = dtPub;
   //    // }

   //    return comment
   // })

   return comment;
}

async function getNotificationsInfo(userId: number) {
   const postersArr = await prisma.posters.findMany({
      where: {
         AND: {
            userId: userId,
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
   console.log("🚀 ~ getNotificationsInfo ~ postersArr:", postersArr)

   const notificationsInfo = postersArr.map(poster => {
      return { posterId: poster.id, posterItem: poster.item }
   })
   console.log("🚀 ~ notificationsInfo ~ notificationsInfo:", notificationsInfo)

   return notificationsInfo
}

class CommentController {
   async createComment(req: Request, res: Response) {
      console.log('--req.body', req.body);

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
               // const userEmail = req.payload?.payload?.email;
               const userId = req.payload?.payload?.id;
               console.log("🚀 ~ file: PosterController.ts:159 ~ PosterController ~ createPoster ~ userId:", userId)
               // const today = getDateToday();
               // console.log(today);

               // ! objectStatus на UI: потеряно, найдено
               // publishDate не во время создания, а в update от админа
               // ! address - API Яндекс.Карты, присвоение квартала всем адресам?
               const { posterId, comment, currentPageLink } = req.body;

               const currentPoster = await prisma.posters.findUnique(
                  {
                     where: {
                        id: posterId,
                     }
                  }
               )

               const createdComment = await prisma.posterComments.create({
                  data: {
                     userId,
                     posterId,
                     comment,
                     readByPosterAuthor: currentPoster?.userId === userId ? true : false,
                     approved: false,
                     changedByAuthor: false,
                     complaintsCount: 0,
                     creationDate: getDateTimeNow(),
                  },
               });
               console.log("🚀 ~ CommentController ~ createComment ~ createdComment:", createdComment)

               const commentsArr = await getCommentsForPoster(posterId);
               const poster = await prisma.posters.findUnique({
                  where: {
                     id: posterId
                  }
               })

               // const message: Message = {
               //    message: 'Объявление отправлено на рассмотрение',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

               const message: Message = {
                  // message: 'Комментарий опубликован',
                  message: commentsArr,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               // не уведомлять автора объявления о комментарии, который написал он
               if (currentPoster?.userId !== userId) {
                  const user = await prisma.users.findUnique({
                     where: {
                        id: userId
                     }
                  })
                  if (user && poster) {
                     sendMailNotification(comment, currentPageLink, poster.item, user.email)
                  }
               }
               res.status(201).json(message);
               return;
            }
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  error: 'Комментирование доступно только авторизованным пользователям',
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
            console.error('Ошибка добавления комментария:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при создании объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            const message: Message = {
               error: 'Произошла ошибка при добавлении комментария',
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

   // ! getPostersBadComments - только для админа общий список в убывающем порядке нумерации по количеству жалоб

   // комменты под постом все видят одинаково
   async getPosterComments(req: Request, res: Response) {
      // const role = req.payload?.payload?.role;
      // const currentUserId = req.payload?.payload?.id
      // const { posterId } = req.body
      const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
      const posterId = parseInt(req.params.posterId);
      console.log("🚀 ~ CommentController ~ getPosterComments ~ req.params.id:", req.params.posterId)
      if (isNaN(posterId)) {
         const message: Message = {
            error: `Объявление не найдено posterId`,
            accountInfo: {
               isAuth: isAuth,
               isNotAdmin: isNotAdmin,
            }
         };
         res.status(404).json(message);
         return;
      }

      // !admin после user
      // if (role === roles.admin) {   // админ видит все в убывающем порядке нумерации по количеству жалоб (от последнего к первому)

      //    const posterStatusFull = await prisma.posterStatuses.findFirst({
      //       where: {
      //          statusName: posterStatuses.deleted
      //       }
      //    });
      //    console.log("🚀 ~ file: PosterController.ts:21 ~ PosterController ~ getAllPosters ~ posterStatusFull:", posterStatusFull)
      //    // where - чтобы не показывать удалённые
      //    const postersArr: Poster[] = await prisma.posters.findMany({
      //       // where: {
      //       //    posterStatusId: {
      //       //       not: posterStatusFull?.id,
      //       //    }
      //       // },
      //       include: {
      //          ObjectCategories: {
      //             select: {
      //                category: true,
      //             },
      //          },
      //          PosterStatuses: {
      //             select: {
      //                statusName: true
      //             }
      //          },
      //       },
      //       orderBy: {
      //          id: 'desc',
      //       },
      //    });

      //    postersArr.map(poster => {
      //       const dtAct = formatDate(new Date(poster.dateOfAction))
      //       poster.dateOfAction = dtAct;

      //       if (poster.publishDate && poster.publishDate !== null) {
      //          const dtPub = formatDate(new Date(poster.publishDate))
      //          poster.publishDate = dtPub;
      //       }

      //       return poster
      //    })

      //    // const posterArrNormalDate = postersArr.map(poster => {
      //    //    console.log('----------');

      //    //    console.log(new Date(poster.dateOfAction));

      //    //    return new Date(poster.dateOfAction)
      //    // })

      //    const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
      //    const message: Message = {
      //       message: postersArr,
      //       accountInfo: {
      //          isAuth: isAuth,
      //          isNotAdmin: isNotAdmin,
      //       }
      //    };
      //    res.json(message);
      //    return;
      // }
      // else {   // все, кроме админа, видят только со статусом Опубликовано, в порядке убывания даты публикации
      // : Comment[]
      const commentsArr: Comment[] = await prisma.posterComments.findMany({
         where: {
            posterId: posterId
         },
         include: {
            Users: {
               select: {
                  name: true,
               },
            },
         },
         orderBy: {
            creationDate: 'desc',
         },
      });

      commentsArr.map(comment => {
         const dtCreation = formatDateTime(new Date(comment.creationDate))
         comment.creationDate = dtCreation;

         // if (poster.publishDate && poster.publishDate !== null) {
         //    const dtPub = formatDate(new Date(poster.publishDate))
         //    poster.publishDate = dtPub;
         // }

         return comment
      })

      // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

      const message: Message = {
         message: commentsArr,
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
      // }
   }

   async processComplaint(req: Request, res: Response) {
      console.log('--req.body', req.body);

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
               // const userId = req.payload?.payload?.id;
               // const today = getDateToday();
               // console.log(today);

               // ! objectStatus на UI: потеряно, найдено
               // publishDate не во время создания, а в update от админа
               // ! address - API Яндекс.Карты, присвоение квартала всем адресам?
               const { commentId } = req.body;

               // const currentPoster = await prisma.posters.findUnique(
               //    {
               //       where: {
               //          id: posterId,
               //       }
               //    }
               // )

               const processedComment = await prisma.posterComments.update({
                  where: {
                     id: commentId,
                  },
                  data: {
                     complaintsCount: {
                        increment: 1
                     }
                  },
               });
               console.log("🚀 ~ CommentController ~ processComplaint ~ processedComment:", processedComment)

               // const message: Message = {
               //    message: 'Объявление отправлено на рассмотрение',
               // };
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               // const badCommentForPoster = await getFirstBadCommentForPoster()

               if (processedComment.posterId) {
                  const commentsArr = await getCommentsForPoster(processedComment.posterId);

                  const message: Message = {
                     message: commentsArr,
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  // 201 - чтобы как и при создании, и удалении сразу перерендерить страницу с новыми данными
                  res.status(201).json(message);
                  return;
               }
               else {
                  const message: Message = {
                     error: 'Произошла ошибка при изменении комментария',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };

                  res.status(500).json(message);
                  return;
               }
               // const message: Message = {
               //    message: 'Жалоба принята',
               //    accountInfo: {
               //       isAuth: isAuth,
               //       isNotAdmin: isNotAdmin,
               //    }
               // };
               // // 201 - для перерендера
               // res.status(201).json(message);
               // return;
            }
            else {
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  error: 'Отправка жалоб на комментарии доступна только авторизованным пользователям',
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
            console.error('Ошибка обработки жалобы на комментарий:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при создании объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            const message: Message = {
               error: 'Произошла ошибка при обработке жалобы на комментарий',
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

   async updateReadByAuthorInComments(req: Request, res: Response) {
      console.log('--req.body', req.body);

      if (!req.payload || req.payload?.payload.role === roles.admin) {
         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            // error: errors.unAuthorized,
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
            // const posterId = parseInt(req.params.id);
            const currentUserId = req.payload?.payload?.id
            const { posterId } = req.body;

            const currentPoster = await prisma.posters.findUnique(
               {
                  where: {
                     id: posterId,
                  }
               }
            )

            if (currentUserId === currentPoster?.userId) {

               const updatedComments = await prisma.posterComments.updateMany({
                  where: {
                     posterId: posterId,
                  },
                  data: {
                     readByPosterAuthor: true
                  },
               });
               console.log("🚀 ~ CommentController ~ updateReadByAuthorInComments ~ updatedComments:", updatedComments)

               const notificationsInfo = await getNotificationsInfo(currentUserId);
               console.log("🚀 ~ CommentController ~ updateReadByAuthorInComments ~ notificationsInfo:", notificationsInfo)
               const message: Message = {
                  message: notificationsInfo,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message)
               return;
            }
            else {
               // const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
               const message: Message = {
                  message: [],
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.json(message);
               return;
            }

         }
         catch (error) {
            console.error('Ошибка обработки жалобы на комментарий:', error);
            // const message: Message = {
            //    error: 'Произошла ошибка при создании объявления',
            // };
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

            const message: Message = {
               error: 'Произошла ошибка при обработке жалобы на комментарий',
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

   async updateComment(req: Request, res: Response) {  // обновление from user
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
            const commentId = req.params.id;
            const userId = req.payload?.payload?.id;

            const { text } = req.body;
            const commentIdNum = parseInt(commentId);

            if (isNaN(commentIdNum)) {
               console.log("🚀 ~ file: UserController.ts:135 ~ getOne ~ isNaN")

               const message: Message = {
                  error: `Комментарий не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            const commentFull = await prisma.posterComments.findUnique({
               where: {
                  id: commentIdNum,
               },
            });

            // меняет объявления только юзер и только свои
            if (role === roles.user && commentFull?.userId === userId) {

               const updatedComment = await prisma.posterComments.update({
                  where: {
                     id: commentIdNum
                  },
                  data: {
                     comment: text,
                     approved: false,
                     readByPosterAuthor: false,
                     changedByAuthor: true,
                     complaintsCount: 0,
                  },
               });
               console.log("🚀 ~ CommentController ~ updateComment ~ updatedComment:", updatedComment)
               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

               if (updatedComment.posterId) {
                  const commentsArr = await getCommentsForPoster(updatedComment.posterId);

                  const message: Message = {
                     message: commentsArr,
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  // 201 - чтобы как и при создании, и удалении сразу перерендерить страницу с новыми данными
                  res.status(201).json(message);
                  return;
               }
               else {
                  const message: Message = {
                     error: 'Произошла ошибка при изменении комментария',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };

                  res.status(500).json(message);
                  return;
               }
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

         } catch (error) {
            console.error('Ошибка изменения комментария:', error);

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при изменении комментария',
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

   async approveComment(req: Request, res: Response) {  // обновление from admin
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
            const commentId = req.params.id;
            const commentIdNum = parseInt(commentId);

            if (isNaN(commentIdNum)) {

               const message: Message = {
                  error: `Комментарий не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            // меняет объявления только admin
            if (role === roles.admin) {

               const approvedComment = await prisma.posterComments.update({
                  where: {
                     id: commentIdNum
                  },
                  data: {
                     approved: true,
                     complaintsCount: 0,
                  },
               });
               console.log("🚀 ~ CommentController ~ approveComment ~ approvedComment:", approvedComment)

               const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);

               if (approvedComment.posterId) {
                  const commentsArr = await getAllComments();

                  const message: Message = {
                     message: commentsArr,
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  // 201 - чтобы как и при создании, и удалении сразу перерендерить страницу с новыми данными
                  res.status(201).json(message);
                  return;

               }
               else {
                  const message: Message = {
                     error: 'Произошла ошибка при изменении комментария',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };

                  res.status(500).json(message);
                  return;
               }

               // const message: Message = {
               //    message: 'Комментарий одобрен',
               //    accountInfo: {
               //       isAuth: isAuth,
               //       isNotAdmin: isNotAdmin,
               //    }
               // };
               // // 201 - чтобы как и при создании, и удалении сразу перерендерить страницу с новыми данными
               // res.status(201).json(message);
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
               res.status(403).json(message);
               return;
            }

         } catch (error) {
            console.error('Ошибка одобрения комментария:', error);

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при одобрении комментария',
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

   async deleteComment(req: Request, res: Response) {
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
         const userId = req.payload?.payload?.id;
         console.log("🚀 ~ file: UserController.ts:225 ~ deleteUser ~ userId:", userId)
         const userRole = req.payload?.payload?.role;

         try {
            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const toDeleteCommentId = parseInt(req.params.id);
            const currentUserId = req.payload?.payload?.id

            if (isNaN(toDeleteCommentId)) {

               const message: Message = {
                  error: `Комментарий не найден`,
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            const commentToDelete = await prisma.posterComments.findUnique({
               where: {
                  id: toDeleteCommentId,
               },
            });

            if (!commentToDelete) {
               const message: Message = {
                  error: 'Комментарий не найден',
                  accountInfo: {
                     isAuth: isAuth,
                     isNotAdmin: isNotAdmin,
                  }
               };
               res.status(404).json(message);
               return;
            }

            // if (commentToDelete.userId !== currentUserId) {
            //    const message: Message = {
            //       error: errors.forbidAccess,
            //       accountInfo: {
            //          isAuth: isAuth,
            //          isNotAdmin: isNotAdmin,
            //       }
            //    };
            //    res.status(403).json(message);
            //    return;
            // }
            if (commentToDelete.userId === currentUserId || userRole === roles.admin) {
               const deletedComment = await prisma.posterComments.delete({
                  where: {
                     id: toDeleteCommentId,
                  },
               });
               console.log("🚀 ~ CommentController ~ deleteUser ~ deletedComment:", deletedComment)

               if (deletedComment.posterId) {
                  let commentsArr

                  if (userRole === roles.admin) {
                     commentsArr = await getAllComments();
                  } else {
                     commentsArr = await getCommentsForPoster(deletedComment.posterId);
                  }

                  const message: Message = {
                     message: commentsArr,
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };
                  // 201 - чтобы как и при создании, и удалении сразу перерендерить страницу с новыми данными
                  res.status(201).json(message);
                  return;

               }
               else {
                  const message: Message = {
                     error: 'Произошла ошибка при изменении комментария',
                     accountInfo: {
                        isAuth: isAuth,
                        isNotAdmin: isNotAdmin,
                     }
                  };

                  res.status(500).json(message);
                  return;
               }

               // const message: Message = {
               //    message: 'Комментарий успешно удален',
               //    accountInfo: {
               //       isAuth: isAuth,
               //       isNotAdmin: isNotAdmin,
               //    }
               // };
               // // статус 201 нужен, чтобы при изменении responseCode в store Comments
               // // снова перерендерились комментарии на странице (это работает при статусе !=200)
               // res.status(201).json(message);
               // return;
            }
            else {
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
            console.log("🚀 ~ CommentController ~ deleteUser ~ error:", error)

            const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
            const message: Message = {
               error: 'Произошла ошибка при удалении комментария',
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

   async getAll(req: Request, res: Response) {

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
      else if (req.payload.payload?.role === roles.admin) {
         const commentsArr: Comment[] = await prisma.posterComments.findMany({

            include: {
               Users: {
                  select: {
                     name: true,
                  },
               },
            },
            orderBy: {
               complaintsCount: 'desc',
            },
         });

         commentsArr.map(comment => {
            const dtCreation = formatDateTime(new Date(comment.creationDate))
            comment.creationDate = dtCreation;

            return comment
         })

         const { isAuth, isNotAdmin } = returnUserInfoToMakeDecisions(req);
         const message: Message = {
            message: commentsArr,
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

}

export default new CommentController();
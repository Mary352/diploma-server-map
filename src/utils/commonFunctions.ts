// export function returnInfoToGenerateHeader(payload: any): { isAuth: boolean; isNotAdmin: boolean; userLoginForLink: string } {
//    const isAuth = payload ? true : false;
//    const isNotAdmin = payload && payload.role === 'admin' ? false : true;
//    const userLoginForLink = payload?.email || '';

import { errors } from "./commonVars";
import { Message } from "./types";

//    return { isAuth, isNotAdmin, userLoginForLink };
// }


// export function forbidAccess(req: Request, res: Response): void {
//    const { isAuth, isNotAdmin, userLoginForLink } = returnInfoToGenerateHeader(req);

//    const message: Message = { error: 'Доступ запрещён' };

//    // res.render('errorPage.hbs', {
//    //    layout: 'main',
//    //    userLoginForLink,
//    //    error: message.error,
//    //    isAuth,
//    //    isNotAdmin,
//    //    scriptFile: 'script_errorPage.js',
//    //    styleFile: 'style_errorPage.css',
//    // });
// }

export function getDateToday(): Date {
   const today = new Date();

   const day = today.getDate();
   today.setDate(day - 2)

   today.setUTCHours(0)
   today.setUTCMinutes(0)
   today.setUTCSeconds(0)
   today.setUTCMilliseconds(0)
   // --------------------------------------------
   console.log("🚀 ~ getDateToday ~ today:", today)
   // const year = today.getFullYear();
   // const month = today.getMonth() + 1; // Месяцы начинаются с 0
   // const day = today.getDate();

   // const strDate = `${year}-${month}-${day}`;
   // console.log(strDate);

   // const dateToday = new Date(strDate);
   // console.log("🚀 ~ file: commonFunctions.ts:36 ~ getDateToday ~ dateToday:", dateToday)

   // return dateToday;
   // --------------------------------------------

   return today
}

export function formatDate(date: Date): string {
   let day: number | string = date.getDate();
   if (day < 10) day = '0' + day;

   let month: number | string = date.getMonth() + 1;
   if (month < 10) month = '0' + month;

   const year: number = date.getFullYear();

   const formattedDate: string = `${day}.${month}.${year}`;
   // console.log(formattedDate);

   return formattedDate;
}

export function formatDateTime(date: Date): string {
   let hours: number | string = date.getHours();
   if (hours < 10) hours = '0' + hours;

   let minutes: number | string = date.getMinutes();
   if (minutes < 10) minutes = '0' + minutes;

   // const year: number = date.getFullYear();
   const formattedDate = formatDate(date)

   const formattedDateTime: string = formattedDate + ` ${hours}:${minutes}`;
   // console.log(formattedDateTime);

   return formattedDateTime;
}

export function getDateTimeNow(): Date {
   const ms = Date.now()
   const date = new Date(ms)

   const day = date.getDate();
   date.setDate(day - 1)

   // const hour = date.getUTCHours();
   // date.setUTCHours(hour - 6)

   return date
}

export function returnErrorMessage(isAuth: boolean, isNotAdmin: boolean, errMessage: string) {
   const message: Message = {
      error: errMessage,
      accountInfo: {
         isAuth: isAuth,
         isNotAdmin: isNotAdmin,
      }
   };
   // res.status(401).json(message)
   return message;
}

export function returnOkMessage(isAuth: boolean, isNotAdmin: boolean, msg: any) {
   const message: Message = {
      message: msg,
      accountInfo: {
         isAuth: isAuth,
         isNotAdmin: isNotAdmin,
      }
   };
   // res.status(401).json(message)
   return message;
}
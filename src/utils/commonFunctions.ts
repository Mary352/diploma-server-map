// export function returnInfoToGenerateHeader(payload: any): { isAuth: boolean; isNotAdmin: boolean; userLoginForLink: string } {
//    const isAuth = payload ? true : false;
//    const isNotAdmin = payload && payload.role === 'admin' ? false : true;
//    const userLoginForLink = payload?.email || '';

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
   const year = today.getFullYear();
   const month = today.getMonth() + 1; // Месяцы начинаются с 0
   const day = today.getDate();

   const strDate = `${year}-${month}-${day}`;
   console.log(strDate);

   const dateToday = new Date(strDate);
   console.log("🚀 ~ file: commonFunctions.ts:36 ~ getDateToday ~ dateToday:", dateToday)

   return dateToday;
}

export function formatDate(date: Date): string {
   let day: number | string = date.getDate();
   if (day < 10) day = '0' + day;

   let month: number | string = date.getMonth() + 1;
   if (month < 10) month = '0' + month;

   const year: number = date.getFullYear();

   const formattedDate: string = `${day}.${month}.${year}`;
   console.log(formattedDate);

   return formattedDate;
}
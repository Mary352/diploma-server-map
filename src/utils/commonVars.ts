type Roles = {
   user: string,
   admin: string
}

export const roles: Roles = {
   user: 'user',
   admin: 'admin'
}

export const errors = {
   forbidAccess: 'Доступ запрещён',
   unAuthorized: 'Для продолжения работы войдите в систему'
}

export const posterStatuses = {
   waitPublication: 'ожидает публикации',
   published: 'опубликовано',
   rejected: 'отклонено',
   updated: 'отредактировано',
   deleted: 'удалено',
   updateRejected: 'изменения отклонены',
   waitDelete: 'ожидает удаления',
}

export const posterDeleteReasons = {
   deleteBeforePublish: 'удалено до публикации',
   found: 'найдено',
   noHope: 'не надеюсь найти',
   mistakePublish: 'публикация по ошибке',
   other: 'другая причина',
   // updateRejected: 'изменения отклонены',
   // waitDelete: 'ожидает удаления',
}

// export const email_auth = {
//    EMAIL: 'buro.nahodok.ifind@gmail.com',
//    PASSWORD: 'yote mcal zqmt kqtl'
// }

// export const EMAIL = 'alice.bv1998@gmail.com';
// export const MAIL_PASSWORD = 'deqq zjtc tpwr kxgb';
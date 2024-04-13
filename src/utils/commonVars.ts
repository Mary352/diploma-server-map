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
   waitDelete: 'ожидает удаления',
   deleted: 'удалено'
}
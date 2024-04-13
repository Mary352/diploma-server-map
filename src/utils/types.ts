export type User = {
   id: number
   email: string;
   name: string;
   password: string;
   phone: string;
   address: string;
   role: string;
}

export type UserLogin = {
   email: string;
   password: string;
}

export type Message = {
   error?: string;
   message?: any;
   rejectReason?: string,
   deleteReason?: string,
   accountInfo: {
      isAuth: boolean,
      isNotAdmin: boolean,
      userId?: number,
      accessToken?: string
   }
   // accountInfo: any;
}

export type Poster = {
   id: number;
   userId: number | null;
   posterStatusId: number | null;
   item: string;
   breed: string | null;
   isPet: boolean;
   itemCategoryId: number | null;
   description: string;
   itemStatus: string;
   dateOfAction: Date | string;
   publishDate?: Date | null | string;
   photoLink?: string;
   address?: string;
   phone: string,
   "ObjectCategories": {
      "category": string
   } | null,
   "PosterStatuses": {
      "statusName": string
   } | null,
   // "DeletedPostersAndReasons": { deleteReasonId: number | null; }[],
   // "UnpublishedPostersAnswers": { description: string | null; }[]
}

export type PosterWithReasons = {
   id: number;
   userId: number | null;
   posterStatusId: number | null;
   item: string;
   breed: string | null;
   isPet: boolean;
   itemCategoryId: number | null;
   description: string;
   itemStatus: string;
   dateOfAction: Date | string;
   publishDate?: Date | null | string;
   photoLink?: string;
   address?: string;
   coord0: string,
   coord1: string,
   phone: string,
   "ObjectCategories": {
      "category": string
   } | null,
   "PosterStatuses": {
      "statusName": string
   } | null,
   "DeletedPostersAndReasons": {
      id: number;
      posterId?: number | null;
      deleteReasonId?: number | null;
      PosterDeleteReasons: {
         reason: string;
      } | null;
   }[],
   "UnpublishedPostersAnswers": { description: string; }[]
}

export type UpdateData = {
   userEmail?: string;
   posterStatusId?: number | null;
   item?: string;
   breed?: string | null;
   isPet?: boolean;
   description?: string;
   itemStatus?: string;
   dateOfAction?: Date;
   photoLink?: string;
   address?: string;
   phone?: string;
   itemCategoryId?: number;
}
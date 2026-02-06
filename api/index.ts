import { app } from '../server/app'; 
// ملحوظة: هنعدل ملف في السيرفر عشان يصدر الـ app ده
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // الكوبري: بياخد الطلب من فيرسل ويديه للتطبيق بتاعنا
  return app(req, res);
}
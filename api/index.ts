import express, { type Request, Response } from 'express';
import { createServer } from 'http';
// نستخدم @ts-ignore لتجنب مشاكل الامتدادات مع TypeScript
// @ts-ignore
import { registerRoutes } from '../server/routes.ts'; 

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

// متغير لضمان عدم تشغيل السيرفر مرتين
let initialized = false;

export default async function handler(req: Request, res: Response) {
  if (!initialized) {
    // تسجيل المسارات عند أول تشغيل فقط
    await registerRoutes(httpServer, app);
    initialized = true;
  }
  return app(req, res);
}
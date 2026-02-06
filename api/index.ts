// @ts-ignore
import { app } from '../server/serverApp.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  return app(req, res);
}
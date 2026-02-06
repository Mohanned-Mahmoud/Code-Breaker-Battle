import express from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

// تسجيل المسارات
// بنستخدم await عشان نضمن إن كل حاجة تمام
(async () => {
  await registerRoutes(httpServer, app);
})();

export { app };
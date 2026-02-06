import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
// تعديل هام: شلنا @shared وحطينا المسار المباشر
import * as schema from "../shared/schema";

const { Pool } = pg;

// تعديل هام: بدل ما نوقف السيرفر، بنطبع تحذير بس
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is missing. Production will fail.");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db",
  // تفعيل SSL عشان فيرسل ونيون يرضوا يكلموا بعض
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
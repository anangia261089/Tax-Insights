import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@/app/lib/env";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = getEnv("DATABASE_URL");
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see DEPLOY.md for Neon setup)."
    );
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };

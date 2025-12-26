import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type CloudflareEnv = {
  DB: D1Database;
};

export const getDb = () => {
  const context = getRequestContext();
  const env = context?.env as CloudflareEnv | undefined;

  if (!env?.DB) {
    throw new Error("D1 binding 'DB' not found. Configure it in Cloudflare Pages.");
  }

  return drizzle(env.DB, { schema });
};

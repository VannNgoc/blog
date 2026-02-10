// lib/db.ts
import { neon } from "@neondatabase/serverless";

// Make sure DATABASE_URL is set in .env
export const sql = neon(process.env.DATABASE_URL!);
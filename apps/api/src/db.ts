import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL ?? 'postgres://poker:poker@localhost:5432/poker';
export const pool = new pg.Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
export * as schema from './schema.js';

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { DATABASE_URL } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
export * as schema from './schema.js';

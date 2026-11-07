import 'dotenv/config';

// Single place where the API reads environment variables.
export const PORT = Number(process.env.PORT ?? 4000);
export const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
export const DEV_AUTH = process.env.DEV_AUTH === 'true';
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://poker:poker@localhost:5432/poker';
export const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

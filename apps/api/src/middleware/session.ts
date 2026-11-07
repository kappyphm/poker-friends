import session from 'express-session';
import { SESSION_SECRET } from '../config/env.js';

declare module 'express-session' {
  interface SessionData { userId?: string }
}

export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 },
});

import type { Express, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { CLIENT_URL, DEV_AUTH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORT } from '../config/env.js';
import { findOrCreateUser, getUserById } from '../services/users.service.js';

export function mountGoogleAuth(app: Express) {
passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      callbackURL: `http://localhost:${PORT}/auth/google/callback`,
    },
    async (_at, _rt, profile, done) => {
      try {
        const user = await findOrCreateUser({
          googleId: profile.id,
          email: profile.emails?.[0]?.value ?? `${profile.id}@google.local`,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });
        done(null, user as Express.User);
      } catch (e) { done(e as Error); }
    },
  ));
  passport.serializeUser((user: Express.User, done) => done(null, (user as unknown as { id: string }).id));
  passport.deserializeUser(async (id: string, done) => {
    try { done(null, (await getUserById(id)) as Express.User); } catch (e) { done(e as Error); }
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?login=failed` }),
    (req, res) => {
      const user = req.user as { id: string } | undefined;
      if (user) req.session.userId = user.id;
      res.redirect(`${CLIENT_URL}/phong-cho`);
    });
}

export function getAuthConfig(_req: Request, res: Response) {
  res.json({ devAuth: DEV_AUTH, googleConfigured: Boolean(GOOGLE_CLIENT_ID) });
}

export async function devLogin(req: Request, res: Response) {
  if (!DEV_AUTH) return res.status(403).json({ error: 'Dev login đang tắt' });
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const user = await findOrCreateUser({ email: `dev-${slug}@poker.local`, name });
  req.session.userId = user.id;
  res.json({ user });
}

export async function getMe(req: Request, res: Response) {
  if (!req.session.userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  res.json({ user });
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => res.json({ ok: true }));
}

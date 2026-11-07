import { Router } from 'express';
import { devLogin, getAuthConfig, getMe, logout } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.get('/api/auth/config', getAuthConfig);
authRouter.post('/api/auth/dev-login', devLogin);
authRouter.get('/api/auth/me', getMe);
authRouter.post('/api/auth/logout', logout);

import { Router } from 'express';
import { getMySessions, getMyStats, getSessionDetail } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const usersRouter = Router();

usersRouter.get('/api/me/stats', requireAuth, getMyStats);
usersRouter.get('/api/me/sessions', requireAuth, getMySessions);
usersRouter.get('/api/me/sessions/:id', requireAuth, getSessionDetail);

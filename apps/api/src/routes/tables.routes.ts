import { Router } from 'express';
import { createTable, getMyTables, getTableByCode } from '../controllers/tables.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const tablesRouter = Router();

tablesRouter.post('/api/tables', requireAuth, createTable);
tablesRouter.get('/api/tables/code/:code', requireAuth, getTableByCode);
tablesRouter.get('/api/tables/mine', requireAuth, getMyTables);

import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { createServer } from 'node:http';
import swaggerUi from 'swagger-ui-express';
import { CLIENT_URL, DEV_AUTH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NODE_ENV, PORT } from './config/env.js';
import { httpLogger, logger } from './lib/logger.js';
import { sessionMiddleware } from './middleware/session.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mountGoogleAuth } from './controllers/auth.controller.js';
import { authRouter } from './routes/auth.routes.js';
import { tablesRouter } from './routes/tables.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { openApiSpec } from './docs/openapi.js';
import { attachSockets } from './sockets/index.js';

const app = express();
const httpServer = createServer(app);

app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) mountGoogleAuth(app);

app.use(authRouter);
app.use(tablesRouter);
app.use(usersRouter);
app.use(healthRouter);

// API docs are a development aid only — never exposed in production.
if (NODE_ENV !== 'production') {
  app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

app.use(errorHandler);

attachSockets(httpServer, sessionMiddleware);

httpServer.listen(PORT, () => {
  logger.info(`Poker API listening on http://localhost:${PORT} (devAuth=${DEV_AUTH})`);
});

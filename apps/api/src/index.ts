import { CLIENT_URL, DEV_AUTH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORT } from './config/env.js';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { createServer } from 'node:http';
import { sessionMiddleware } from './middleware/session.js';
import { mountGoogleAuth } from './controllers/auth.controller.js';
import { authRouter } from './routes/auth.routes.js';
import { tablesRouter } from './routes/tables.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { attachSockets } from './sockets/index.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) mountGoogleAuth(app);

app.use(authRouter);
app.use(tablesRouter);
app.use(usersRouter);
app.use(healthRouter);

attachSockets(httpServer, sessionMiddleware);

httpServer.listen(PORT, () => {
  console.log(`Poker API listening on http://localhost:${PORT} (devAuth=${DEV_AUTH})`);
});

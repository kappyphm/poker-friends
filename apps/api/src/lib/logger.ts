import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from '../config/env.js';

/**
 * The API's logging setup (pino), in two parts:
 *
 * - `logger` — the single app logger. Structured JSON with ISO 8601
 *   timestamps in production; pretty output via pino-pretty in
 *   development. Sensitive fields are redacted so cookies, authorization
 *   headers and session data never reach the logs.
 * - `httpLogger` — per-request access logging (pino-http), mounted right
 *   after the request-id middleware. It adopts the id that middleware
 *   assigned, so one id ties together the `x-request-id` response header,
 *   REST error bodies and every log line for the request. Levels follow
 *   the outcome: 5xx → error, 4xx → warn, everything else → info. Health
 *   checks and Socket.IO transport traffic are not access-logged — they
 *   would flood the log without adding signal. Request headers are never
 *   serialized; the redaction below is a second line of defence.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'headers.cookie',
      'headers.authorization',
      'cookie',
      'authorization',
      'session',
      'sessionId',
      'req.session',
    ],
    censor: '[REDACTED]',
  },
  transport:
    config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
      : undefined,
});

type RequestWithId = IncomingMessage & { id?: string; requestId?: string };

/** Paths whose traffic is high-volume and low-signal: never access-logged. */
function isMuted(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  return path === '/api/health' || path.startsWith('/socket.io/');
}

export const httpLogger = pinoHttp({
  logger,
  // The request-id middleware runs first and owns the id (response header
  // + error bodies); pino-http reuses it instead of minting a second one.
  genReqId: (req) => (req as RequestWithId).requestId ?? randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => isMuted(req.url) },
  // Minimal serializers on purpose: method + url for the request, status
  // for the response — headers, cookies and bodies never reach the log.
  serializers: {
    req: (req: RequestWithId) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
  customSuccessObject: (req, _res, logObj) => ({
    ...logObj,
    requestId: (req as RequestWithId).id,
  }),
  customErrorObject: (req, _res, _err, logObj) => ({
    ...logObj,
    requestId: (req as RequestWithId).id,
  }),
});

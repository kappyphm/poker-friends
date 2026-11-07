import pino from 'pino';
import { config } from '../config/env.js';

/**
 * The API's single logger (pino). Structured JSON in production; pretty
 * output via pino-pretty in development. Sensitive fields are redacted so
 * cookies, authorization headers and session data never reach the logs.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
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

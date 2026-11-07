import { ErrorCode } from '@poker/shared';
import { ERROR_CATALOG } from '../errors/catalog.js';

/**
 * The API's OpenAPI document, declared centrally in one file.
 *
 * Errors are part of the contract: every error response has the shape
 * `{ "error": { "code": "T2001" } }` — a code only, never a message.
 * The full code table below is generated from the backend error catalog,
 * so the docs can never drift from the codes the API actually sends.
 */

const errorCodeTable = [
  '| Code | HTTP status | Meaning |',
  '| ---- | ----------- | ------- |',
  ...Object.values(ErrorCode).map(
    (code) => `| ${code} | ${ERROR_CATALOG[code].httpStatus} | ${ERROR_CATALOG[code].message} |`,
  ),
].join('\n');

const errorResponses = (codes: ErrorCode[]) => {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of codes) {
    const status = ERROR_CATALOG[code].httpStatus;
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  const out: Record<string, unknown> = {};
  for (const [status, group] of byStatus) {
    out[String(status)] = {
      description: group.map((c) => `${c} — ${ERROR_CATALOG[c].message}`).join('; '),
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          examples: Object.fromEntries(
            group.map((c) => [c, { value: { error: { code: c } } }]),
          ),
        },
      },
    };
  }
  return out;
};

const ok = (schema: Record<string, unknown>, description = 'OK') => ({
  '200': {
    description,
    content: { 'application/json': { schema } },
  },
});

const obj = (properties: Record<string, unknown>, required?: string[]) => ({
  type: 'object',
  properties,
  ...(required ? { required } : {}),
});

const userSchema = obj(
  {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string' },
    name: { type: 'string' },
    avatarUrl: { type: 'string', nullable: true },
  },
  ['id', 'email', 'name'],
);

const tableSchema = obj(
  {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', description: '6-character invite code' },
    name: { type: 'string' },
    hostId: { type: 'string', format: 'uuid' },
    seats: { type: 'integer', minimum: 3, maximum: 10 },
    minBuyIn: { type: 'integer' },
    smallBlind: { type: 'integer' },
    bigBlind: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  ['id', 'code', 'name', 'hostId', 'seats', 'minBuyIn', 'smallBlind', 'bigBlind'],
);

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Poker Friends API',
    version: '1.0.0',
    description: [
      'REST API for Poker Friends (private Texas Hold\'em tables for friends).',
      'Realtime gameplay runs over Socket.IO — see `docs/api.md` for the socket contract.',
      '',
      '## Error contract',
      '',
      'Every error response is `{ "error": { "code": "<CODE>" } }` — a stable,',
      'machine-readable code and nothing else. Clients map codes to their own',
      'localized messages and per-code handling; the API never sends prose.',
      '',
      '## Error codes',
      '',
      errorCodeTable,
    ].join('\n'),
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'health', description: 'Service health' },
    { name: 'auth', description: 'Authentication & session' },
    { name: 'tables', description: 'Tables & lobby' },
    { name: 'me', description: 'Current user: stats & history' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        responses: ok(obj({ ok: { type: 'boolean' } }, ['ok'])),
      },
    },
    '/api/auth/config': {
      get: {
        tags: ['auth'],
        summary: 'Public auth configuration (which login methods are enabled)',
        responses: ok(
          obj({ devAuth: { type: 'boolean' }, googleConfigured: { type: 'boolean' } }, [
            'devAuth',
            'googleConfigured',
          ]),
        ),
      },
    },
    '/auth/google': {
      get: {
        tags: ['auth'],
        summary: 'Start Google OAuth login (browser redirect flow)',
        responses: { '302': { description: 'Redirect to Google' } },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['auth'],
        summary: 'Google OAuth callback; sets the session cookie and redirects to the client',
        responses: { '302': { description: 'Redirect to the web client' } },
      },
    },
    '/api/auth/dev-login': {
      post: {
        tags: ['auth'],
        summary: 'Dev-only login by display name (requires DEV_AUTH=true)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: obj({ name: { type: 'string' } }, ['name']),
            },
          },
        },
        responses: {
          ...ok(obj({ user: userSchema }, ['user'])),
          ...errorResponses([
            ErrorCode.DEV_LOGIN_DISABLED,
            ErrorCode.VALIDATION_ERROR,
            ErrorCode.INTERNAL_ERROR,
          ]),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'The currently signed-in user',
        responses: {
          ...ok(obj({ user: userSchema }, ['user'])),
          ...errorResponses([ErrorCode.AUTH_REQUIRED, ErrorCode.ACCOUNT_NOT_FOUND]),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Destroy the current session',
        responses: ok(obj({ ok: { type: 'boolean' } }, ['ok'])),
      },
    },
    '/api/tables': {
      post: {
        tags: ['tables'],
        summary: 'Create a table (the caller becomes the host)',
        security: [{ cookieSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: obj({
                name: { type: 'string' },
                seats: { type: 'integer', minimum: 3, maximum: 10 },
                minBuyIn: { type: 'integer', minimum: 1 },
                smallBlind: { type: 'integer', minimum: 1 },
                bigBlind: { type: 'integer', minimum: 1 },
              }),
            },
          },
        },
        responses: {
          ...ok(obj({ table: tableSchema }, ['table'])),
          ...errorResponses([ErrorCode.AUTH_REQUIRED, ErrorCode.ACCOUNT_NOT_FOUND]),
        },
      },
    },
    '/api/tables/code/{code}': {
      get: {
        tags: ['tables'],
        summary: 'Look up a table by its invite code',
        security: [{ cookieSession: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          ...ok(
            obj(
              { table: { allOf: [tableSchema, obj({ hostName: { type: 'string' } })] } },
              ['table'],
            ),
          ),
          ...errorResponses([
            ErrorCode.AUTH_REQUIRED,
            ErrorCode.ACCOUNT_NOT_FOUND,
            ErrorCode.TABLE_NOT_FOUND,
          ]),
        },
      },
    },
    '/api/tables/mine': {
      get: {
        tags: ['tables'],
        summary: 'Tables hosted by the caller and tables they have played at',
        security: [{ cookieSession: [] }],
        responses: {
          ...ok(
            obj(
              {
                hosted: { type: 'array', items: tableSchema },
                joined: { type: 'array', items: tableSchema },
              },
              ['hosted', 'joined'],
            ),
          ),
          ...errorResponses([ErrorCode.AUTH_REQUIRED, ErrorCode.ACCOUNT_NOT_FOUND]),
        },
      },
    },
    '/api/me/stats': {
      get: {
        tags: ['me'],
        summary: 'Lifetime stats of the current user',
        security: [{ cookieSession: [] }],
        responses: {
          ...ok(
            obj({
              totalSessions: { type: 'integer' },
              totalHands: { type: 'integer' },
              totalHandsWon: { type: 'integer' },
              winRate: { type: 'number' },
              totalBuyIn: { type: 'integer' },
              totalNet: { type: 'integer' },
            }),
          ),
          ...errorResponses([ErrorCode.AUTH_REQUIRED, ErrorCode.ACCOUNT_NOT_FOUND]),
        },
      },
    },
    '/api/me/sessions': {
      get: {
        tags: ['me'],
        summary: 'Play sessions of the current user (most recent first)',
        security: [{ cookieSession: [] }],
        responses: {
          ...ok(obj({ sessions: { type: 'array', items: { type: 'object' } } }, ['sessions'])),
          ...errorResponses([ErrorCode.AUTH_REQUIRED, ErrorCode.ACCOUNT_NOT_FOUND]),
        },
      },
    },
    '/api/me/sessions/{id}': {
      get: {
        tags: ['me'],
        summary: 'One play session with every recorded hand',
        security: [{ cookieSession: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          ...ok(
            obj(
              {
                session: { type: 'object' },
                hands: { type: 'array', items: { type: 'object' } },
              },
              ['session', 'hands'],
            ),
          ),
          ...errorResponses([
            ErrorCode.AUTH_REQUIRED,
            ErrorCode.ACCOUNT_NOT_FOUND,
            ErrorCode.PLAY_SESSION_NOT_FOUND,
          ]),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieSession: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session cookie set by Google login or dev-login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Stable machine-readable error code (see the code table above)',
                example: ErrorCode.TABLE_NOT_FOUND,
              },
              details: {
                type: 'array',
                description: 'Optional per-field validation details (codes only)',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    code: { type: 'string' },
                  },
                  required: ['field', 'code'],
                },
              },
            },
            required: ['code'],
          },
        },
        required: ['error'],
      },
    },
  },
};

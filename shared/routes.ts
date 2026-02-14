import { z } from 'zod';

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  badRequest: z.object({ message: z.string() }),
};

export const api = {
  games: {
    create: {
      method: 'POST' as const,
      path: '/api/games',
      input: z.object({
        mode: z.enum(['normal', 'blitz', 'glitch']).default('normal'),
      }),
      responses: {
        201: z.object({ id: z.number() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/games/:id',
      responses: {
        200: z.any(), 
        404: errorSchemas.notFound,
      },
    },
    setup: {
      method: 'POST' as const,
      path: '/api/games/:id/setup',
      input: z.object({
        player: z.enum(['p1', 'p2']),
        code: z.string().length(4).regex(/^\d+$/),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.badRequest,
      },
    },
    guess: {
      method: 'POST' as const,
      path: '/api/games/:id/guess',
      input: z.object({
        player: z.enum(['p1', 'p2']),
        guess: z.string().length(4).regex(/^\d+$/),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.badRequest,
      },
    },
    powerup: {
      method: 'POST' as const,
      path: '/api/games/:id/powerup',
      responses: {
        200: z.any(),
        400: errorSchemas.badRequest,
      },
    },
    timeout: {
      method: 'POST' as const,
      path: '/api/games/:id/timeout',
      responses: {
        200: z.any(),
        400: errorSchemas.badRequest,
      },
    },
    logs: {
      method: 'GET' as const,
      path: '/api/games/:id/logs',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
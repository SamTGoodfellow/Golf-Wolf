import { z } from 'zod';
import { insertPlayerSchema, games, players, holeResults } from './schema';

// ============================================
// ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  games: {
    create: {
      method: 'POST' as const,
      path: '/api/games',
      input: z.object({}),
      responses: {
        201: z.custom<typeof games.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/games/:id',
      responses: {
        200: z.object({
          game: z.custom<typeof games.$inferSelect>(),
          players: z.array(z.custom<typeof players.$inferSelect>()),
          results: z.array(z.custom<typeof holeResults.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/games/:id/start',
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    restart: {
      method: 'POST' as const,
      path: '/api/games/:id/restart',
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  players: {
    create: {
      method: 'POST' as const,
      path: '/api/games/:gameId/players',
      input: insertPlayerSchema.omit({ gameId: true }),
      responses: {
        201: z.custom<typeof players.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/players/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  holes: {
    submit: {
      method: 'POST' as const,
      path: '/api/games/:gameId/holes',
      input: z.object({
        holeNumber: z.number().min(1).max(18),
        wolfId: z.number(),
        partnerId: z.number().nullable(),
        isLoneWolf: z.boolean(),
        winnerIds: z.array(z.number()),
      }),
      responses: {
        200: z.custom<typeof holeResults.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
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

// ============================================
// TYPES
// ============================================
export type GameResponse = z.infer<typeof api.games.get.responses[200]>;
export type CreatePlayerInput = z.infer<typeof api.players.create.input>;
export type SubmitHoleInput = z.infer<typeof api.holes.submit.input>;

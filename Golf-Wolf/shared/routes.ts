import { z } from 'zod';
import { insertPlayerSchema, games, players, holeResults, type HoleResult } from './schema';

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
// COURSE API TYPES
// ============================================
export interface CourseHole {
  par: number;
  yardage: number;
}

export interface CourseTee {
  tee_name: string;
  par_total: number;
  total_yards: number;
  holes: CourseHole[];
}

export interface Course {
  id: number;
  club_name: string;
  course_name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  tees: {
    male?: CourseTee[];
    female?: CourseTee[];
  };
}

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
          results: z.array(z.custom<HoleResult>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/games/:id/start',
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        400: errorSchemas.validation,
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
    summary: {
      method: 'POST' as const,
      path: '/api/games/:id/summary',
      responses: {
        200: z.object({ summary: z.string() }),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
    setOrder: {
      method: 'POST' as const,
      path: '/api/games/:id/order',
      input: z.object({
        playerOrder: z.array(z.number()).min(3),
      }),
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    setCourse: {
      method: 'POST' as const,
      path: '/api/games/:id/course',
      input: z.object({
        courseId: z.number(),
        courseName: z.string(),
        selectedTee: z.string(),
        coursePar: z.array(z.number()).length(18),
        courseYardage: z.array(z.number()).length(18),
      }),
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        403: errorSchemas.validation,
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
        isBlindWolf: z.boolean(),
        isDraw: z.boolean(),
        winnerIds: z.array(z.number()).optional().default([]),
        netScores: z.record(z.string(), z.number()).optional(),
      }),
      responses: {
        200: z.custom<HoleResult>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    edit: {
      method: 'PUT' as const,
      path: '/api/games/:gameId/holes/:holeNumber',
      input: z.object({
        wolfId: z.number(),
        partnerId: z.number().nullable(),
        isLoneWolf: z.boolean(),
        isBlindWolf: z.boolean(),
        isDraw: z.boolean(),
        winnerIds: z.array(z.number()).optional().default([]),
        netScores: z.record(z.string(), z.number()).optional(),
      }),
      responses: {
        200: z.custom<HoleResult>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  courses: {
    search: {
      method: 'GET' as const,
      path: '/api/courses/search',
    },
    get: {
      method: 'GET' as const,
      path: '/api/courses/:courseId',
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
// WOLF ROTATION HELPERS
// ============================================
export function getWolfId(playerOrder: number[], holeNumber: number): number {
  const len = playerOrder.length;
  return playerOrder[(holeNumber + len - 2) % len];
}

export function resolveWolfId(
  playerOrder: number[],
  holeNumber: number,
  players?: Array<{ id: number; score: number }>
): number {
  if (playerOrder.length === 4 && (holeNumber === 17 || holeNumber === 18) && players && players.length === 4) {
    const sorted = [...players].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return playerOrder.indexOf(a.id) - playerOrder.indexOf(b.id);
    });
    return sorted[0].id;
  }
  return getWolfId(playerOrder, holeNumber);
}

export function getTeeOffOrder(
  playerOrder: number[],
  holeNumber: number,
  players?: Array<{ id: number; score: number }>
): number[] {
  const wolfId = resolveWolfId(playerOrder, holeNumber, players);
  return [...playerOrder.filter(id => id !== wolfId), wolfId];
}

// ============================================
// TYPES
// ============================================
export type GameResponse = z.infer<typeof api.games.get.responses[200]>;
export type CreatePlayerInput = z.infer<typeof api.players.create.input>;
export type SubmitHoleInput = z.infer<typeof api.holes.submit.input>;
export type EditHoleInput = z.infer<typeof api.holes.edit.input>;
export type SetOrderInput = z.infer<typeof api.games.setOrder.input>;
export type SetCourseInput = z.infer<typeof api.games.setCourse.input>;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreatePlayerInput, type SubmitHoleInput } from "@shared/routes";

// GET /api/games/:id
export function useGame(id: number | null) {
  return useQuery({
    queryKey: [api.games.get.path, id],
    queryFn: async () => {
      if (!id) throw new Error("No game ID");
      const url = buildUrl(api.games.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Game not found");
      if (!res.ok) throw new Error("Failed to fetch game");
      return api.games.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/games
export function useCreateGame() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty object as per schema
      });
      if (!res.ok) throw new Error("Failed to create game");
      return api.games.create.responses[201].parse(await res.json());
    },
  });
}

// POST /api/games/:id/start
export function useStartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.games.start.path, { id });
      const res = await fetch(url, { method: api.games.start.method });
      if (!res.ok) throw new Error("Failed to start game");
      return api.games.start.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.id] });
    },
  });
}

// POST /api/games/:id/restart
export function useRestartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.games.restart.path, { id });
      const res = await fetch(url, { method: api.games.restart.method });
      if (!res.ok) throw new Error("Failed to restart game");
      return api.games.restart.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.id] });
    },
  });
}

// POST /api/games/:gameId/players
export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: number; data: CreatePlayerInput }) => {
      const url = buildUrl(api.players.create.path, { gameId });
      // Validate input manually before sending if needed, but api handles it
      const res = await fetch(url, {
        method: api.players.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add player");
      return api.players.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

// DELETE /api/players/:id
export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, gameId }: { id: number; gameId: number }) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, { method: api.players.delete.method });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

// POST /api/games/:gameId/holes
export function useSubmitHole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: number; data: SubmitHoleInput }) => {
      const url = buildUrl(api.holes.submit.path, { gameId });
      const res = await fetch(url, {
        method: api.holes.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid hole submission");
        }
        throw new Error("Failed to submit hole");
      }
      return api.holes.submit.responses[200].parse(await res.json());
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

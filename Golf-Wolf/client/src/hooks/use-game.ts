import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreatePlayerInput, type SubmitHoleInput, type EditHoleInput, type SetOrderInput, type SetCourseInput, type Course } from "@shared/routes";
import posthog from "@/lib/analytics";

// ============================================
// ADMIN TOKEN HELPERS
// ============================================
const tokenKey = (gameId: string) => `golf-wolf-admin-${gameId}`;
const storeAdminToken = (gameId: string, token: string) =>
  localStorage.setItem(tokenKey(gameId), token);
const getAdminToken = (gameId: string): string =>
  localStorage.getItem(tokenKey(gameId)) ?? "";

// ============================================
// GAME HOOKS
// ============================================

export function useGame(id: string | null) {
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

export function useCreateGame() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to create game");
      const data = await res.json();
      storeAdminToken(String(data.id), data.adminToken);
      return api.games.create.responses[201].parse(data);
    },
  });
}

export function useSetPlayerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: SetOrderInput }) => {
      const url = buildUrl(api.games.setOrder.path, { id: gameId });
      const res = await fetch(url, {
        method: api.games.setOrder.method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken(gameId) },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to set player order");
      return api.games.setOrder.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.id] });
    },
  });
}

export function useSetCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: SetCourseInput }) => {
      const url = buildUrl(api.games.setCourse.path, { id: gameId });
      const res = await fetch(url, {
        method: api.games.setCourse.method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken(gameId) },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to set course");
      return res.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

export function useStartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.games.start.path, { id });
      const res = await fetch(url, {
        method: api.games.start.method,
        headers: { "X-Admin-Token": getAdminToken(id) },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start game");
      }
      return api.games.start.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      posthog.capture("game_started", { game_id: data.id });
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.id] });
    },
  });
}

export function useRestartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.games.restart.path, { id });
      const res = await fetch(url, {
        method: api.games.restart.method,
        headers: { "X-Admin-Token": getAdminToken(id) },
      });
      if (!res.ok) throw new Error("Failed to restart game");
      return api.games.restart.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.id] });
    },
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: CreatePlayerInput }) => {
      const url = buildUrl(api.players.create.path, { gameId });
      const res = await fetch(url, {
        method: api.players.create.method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken(gameId) },
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

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, gameId }: { id: number; gameId: string }) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, {
        method: api.players.delete.method,
        headers: { "X-Admin-Token": getAdminToken(gameId) },
      });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

export function useSubmitHole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: SubmitHoleInput }) => {
      const url = buildUrl(api.holes.submit.path, { gameId });
      const res = await fetch(url, {
        method: api.holes.submit.method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken(gameId) },
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
    onSuccess: (data, { gameId }) => {
      if (data.holeNumber === 18) posthog.capture("game_ended", { game_id: gameId });
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

export function useGameSummary(gameId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [api.games.summary.path, gameId],
    queryFn: async () => {
      if (!gameId) throw new Error("No game ID");
      const url = buildUrl(api.games.summary.path, { id: gameId });
      const res = await fetch(url, {
        method: api.games.summary.method,
        headers: { "X-Admin-Token": getAdminToken(gameId) },
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      return api.games.summary.responses[200].parse(await res.json());
    },
    enabled: !!gameId && enabled,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useEditHole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, holeNumber, data }: { gameId: string; holeNumber: number; data: EditHoleInput }) => {
      const url = buildUrl(api.holes.edit.path, { gameId, holeNumber });
      const res = await fetch(url, {
        method: api.holes.edit.method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": getAdminToken(gameId) },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid hole edit");
        }
        throw new Error("Failed to edit hole");
      }
      return api.holes.edit.responses[200].parse(await res.json());
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, gameId] });
    },
  });
}

// ============================================
// COURSE HOOKS
// ============================================

export function useSearchCourses(query: string) {
  return useQuery({
    queryKey: [api.courses.search.path, query],
    queryFn: async (): Promise<{ courses: Course[] }> => {
      const res = await fetch(`${api.courses.search.path}?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Course search failed");
      return res.json();
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

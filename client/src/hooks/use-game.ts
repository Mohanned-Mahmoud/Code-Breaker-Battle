import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type GameStateResponse } from "@shared/schema";

// Game State Hook
export function useGame(id: number) {
  return useQuery<GameStateResponse>({
    queryKey: [buildUrl(api.games.get.path, { id })],
    queryFn: async () => {
      const url = buildUrl(api.games.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Game not found");
      if (!res.ok) throw new Error("Failed to fetch game");
      return await res.json();
    },
    refetchInterval: 1000, // Poll every second for live updates
  });
}

// Create Game
export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
      });
      if (!res.ok) throw new Error("Failed to create game");
      return api.games.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate list queries if we had any
    },
  });
}

// Setup Game (Set Master Key)
export function useSetupGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, player, code }: { id: number; player: 'p1' | 'p2'; code: string }) => {
      const validated = api.games.setup.input.parse({ player, code });
      const url = buildUrl(api.games.setup.path, { id });
      const res = await fetch(url, {
        method: api.games.setup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to setup game");
      }
      return await res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] });
    },
  });
}

// Make Guess
export function useMakeGuess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, player, guess }: { id: number; player: 'p1' | 'p2'; guess: string }) => {
      const validated = api.games.guess.input.parse({ player, guess });
      const url = buildUrl(api.games.guess.path, { id });
      const res = await fetch(url, {
        method: api.games.guess.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit guess");
      }
      return await res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] });
    },
  });
}

// Use Powerup
export function usePowerup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, player, type }: { id: number; player: 'p1' | 'p2'; type: 'firewall' | 'bruteforce' }) => {
      const validated = api.games.powerup.input.parse({ player, type });
      const url = buildUrl(api.games.powerup.path, { id });
      const res = await fetch(url, {
        method: api.games.powerup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to use powerup");
      }
      return await res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] });
    },
  });
}

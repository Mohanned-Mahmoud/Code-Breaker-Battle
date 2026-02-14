import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type GameStateResponse } from "@shared/schema";

export function useGame(id: number) {
  return useQuery<GameStateResponse>({
    queryKey: [buildUrl(api.games.get.path, { id })],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.games.get.path, { id }));
      if (res.status === 404) throw new Error("Game not found");
      if (!res.ok) throw new Error("Failed to fetch game");
      return await res.json();
    },
    refetchInterval: 1000, 
  });
}

// --- UPDATED: Pass Custom Settings ---
export function useCreateGame() {
  return useMutation({
    mutationFn: async ({ mode, customSettings }: { mode: string, customSettings?: any }) => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, customSettings })
      });
      if (!res.ok) throw new Error("Failed to create game");
      return await res.json();
    }
  });
}

export function useSetupGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, player, code }: { id: number; player: 'p1' | 'p2'; code: string }) => {
      const res = await fetch(buildUrl(api.games.setup.path, { id }), {
        method: api.games.setup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, code }),
      });
      if (!res.ok) throw new Error("Failed to setup game");
      return await res.json();
    },
    onSuccess: (_, { id }) => { queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] }); },
  });
}

export function useMakeGuess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, player, guess }: { id: number; player: 'p1' | 'p2'; guess: string }) => {
      const res = await fetch(buildUrl(api.games.guess.path, { id }), {
        method: api.games.guess.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, guess }),
      });
      if (!res.ok) throw new Error("Failed to submit guess");
      return await res.json();
    },
    onSuccess: (_, { id }) => { queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] }); },
  });
}

export function usePowerup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: any) => {
      const res = await fetch(buildUrl(api.games.powerup.path, { id: args.id }), {
        method: api.games.powerup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error("Failed to use powerup");
      return await res.json();
    },
    onSuccess: (_, { id }) => { queryClient.invalidateQueries({ queryKey: [buildUrl(api.games.get.path, { id })] }); },
  });
}

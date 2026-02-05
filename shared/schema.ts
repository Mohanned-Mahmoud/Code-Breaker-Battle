import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 5 }).unique(),
  p1Code: varchar("p1_code", { length: 4 }),
  p2Code: varchar("p2_code", { length: 4 }),
  status: text("status", { enum: ['setup', 'playing', 'finished'] }).notNull().default('setup'),
  turn: text("turn", { enum: ['p1', 'p2'] }).default('p1'),
  winner: text("winner", { enum: ['p1', 'p2'] }),
  p1FirewallUsed: boolean("p1_firewall_used").default(false),
  p1BruteforceUsed: boolean("p1_bruteforce_used").default(false),
  p2FirewallUsed: boolean("p2_firewall_used").default(false),
  p2BruteforceUsed: boolean("p2_bruteforce_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameLogs = pgTable("game_logs", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ['info', 'success', 'warning', 'error'] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertGameLogSchema = createInsertSchema(gameLogs).omit({ id: true, timestamp: true });
export type GameLog = typeof gameLogs.$inferSelect;


export const guesses = pgTable("guesses", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  player: text("player", { enum: ['p1', 'p2'] }).notNull(),
  guess: varchar("guess", { length: 4 }).notNull(),
  hits: integer("hits").notNull(),
  blips: integer("blips").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  turn: true,
  winner: true,
  p1FirewallUsed: true,
  p1BruteforceUsed: true,
  p2FirewallUsed: true,
  p2BruteforceUsed: true 
});

export const insertGuessSchema = createInsertSchema(guesses).omit({ 
  id: true, 
  createdAt: true,
  hits: true,
  blips: true 
});

// === TYPES ===
export type Game = typeof games.$inferSelect;
export type Guess = typeof guesses.$inferSelect;

export type CreateGameRequest = {}; // Empty body to start
export type SetupGameRequest = { player: 'p1' | 'p2', code: string };
export type MakeGuessRequest = { gameId: number, player: 'p1' | 'p2', guess: string };
export type UsePowerupRequest = { gameId: number, player: 'p1' | 'p2', type: 'firewall' | 'bruteforce' };

// Response type for the game state that masks secret info
export type GameStateResponse = {
  id: number;
  status: 'setup' | 'playing' | 'finished';
  turn: 'p1' | 'p2' | null;
  winner: 'p1' | 'p2' | null;
  p1Setup: boolean; // True if p1 has entered code
  p2Setup: boolean; // True if p2 has entered code
  p1FirewallUsed: boolean;
  p1BruteforceUsed: boolean;
  p2FirewallUsed: boolean;
  p2BruteforceUsed: boolean;
  guesses: Guess[];
  // For brute force result
  bruteForceResult?: { type: 'even' | 'odd', sum: number }; 
};

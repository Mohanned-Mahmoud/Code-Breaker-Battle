import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- TABLES ---

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  // Added roomId here
  roomId: text("room_id").notNull(), 
  status: text("status").notNull().default("waiting"), // waiting, setup, playing, finished
  turn: text("turn").notNull().default("p1"), // p1, p2
  winner: text("winner"),
  
  // Player 1 Data
  p1Code: text("p1_code"),
  p1Setup: boolean("p1_setup").default(false),
  p1FirewallUsed: boolean("p1_firewall_used").default(false),
  p1BruteforceUsed: boolean("p1_bruteforce_used").default(false),

  // Player 2 Data
  p2Code: text("p2_code"),
  p2Setup: boolean("p2_setup").default(false),
  p2FirewallUsed: boolean("p2_firewall_used").default(false),
  p2BruteforceUsed: boolean("p2_bruteforce_used").default(false),
});

export const guesses = pgTable("guesses", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  player: text("player").notNull(), // p1, p2
  guess: text("guess").notNull(),
  hits: integer("hits").notNull(),
  blips: integer("blips").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  type: text("type").notNull(), // info, warning, error, success
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// --- ZOD SCHEMAS ---

export const insertGameSchema = createInsertSchema(games);
export const insertGuessSchema = createInsertSchema(guesses);
export const insertLogSchema = createInsertSchema(logs);

// --- TYPES ---

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

export type Guess = typeof guesses.$inferSelect;
export type InsertGuess = typeof guesses.$inferInsert;

export type GameLog = typeof logs.$inferSelect;

// --- API TYPES ---

export type GameStateResponse = Game & {
  guesses: Guess[];
};
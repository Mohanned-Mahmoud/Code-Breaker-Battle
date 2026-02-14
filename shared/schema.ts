import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  status: text("status").notNull().default("waiting"),
  turn: text("turn").notNull().default("p1"),
  winner: text("winner"),
  isFirewallActive: boolean("is_firewall_active").default(false),
  
  // Timestamp to track age
  createdAt: timestamp("created_at").defaultNow(),

  // Player 1
  p1Code: text("p1_code"),
  p1Setup: boolean("p1_setup").default(false),
  p1FirewallUsed: boolean("p1_firewall_used").default(false),
  p1BruteforceUsed: boolean("p1_bruteforce_used").default(false),
  p1ChangeDigitUsed: boolean("p1_change_digit_used").default(false),
  p1SwapDigitsUsed: boolean("p1_swap_digits_used").default(false),

  // Player 2
  p2Code: text("p2_code"),
  p2Setup: boolean("p2_setup").default(false),
  p2FirewallUsed: boolean("p2_firewall_used").default(false),
  p2BruteforceUsed: boolean("p2_bruteforce_used").default(false),
  p2ChangeDigitUsed: boolean("p2_change_digit_used").default(false),
  p2SwapDigitsUsed: boolean("p2_swap_digits_used").default(false),
});

export const guesses = pgTable("guesses", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  player: text("player").notNull(),
  guess: text("guess").notNull(),
  hits: integer("hits").notNull(),
  blips: integer("blips").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games);
export const insertGuessSchema = createInsertSchema(guesses);
export const insertLogSchema = createInsertSchema(logs);

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type Guess = typeof guesses.$inferSelect;
export type InsertGuess = typeof guesses.$inferInsert;
export type GameLog = typeof logs.$inferSelect;

export type GameStateResponse = Game & {
  guesses: Guess[];
};
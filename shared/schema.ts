import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  mode: text("mode").notNull().default("normal"),
  status: text("status").notNull().default("waiting"),
  turn: text("turn").notNull().default("p1"),
  turnStartedAt: timestamp("turn_started_at").defaultNow(),
  turnCount: integer("turn_count").default(0),
  winner: text("winner"),
  
  isFirewallActive: boolean("is_firewall_active").default(false),
  isTimeHackActive: boolean("is_time_hack_active").default(false),
  
  // --- CUSTOM MODE SETTINGS ---
  customTimer: boolean("custom_timer").default(false),
  allowFirewall: boolean("allow_firewall").default(true),
  allowVirus: boolean("allow_virus").default(true),
  allowBruteforce: boolean("allow_bruteforce").default(true),
  allowChangeDigit: boolean("allow_change_digit").default(true),
  allowSwapDigits: boolean("allow_swap_digits").default(true),
  allowEmp: boolean("allow_emp").default(false), // NEW
  allowSpyware: boolean("allow_spyware").default(false), // NEW
  allowHoneypot: boolean("allow_honeypot").default(false), // NEW

  createdAt: timestamp("created_at").defaultNow(),

  // Player 1
  p1Code: text("p1_code"),
  p1Setup: boolean("p1_setup").default(false),
  p1FirewallUsed: boolean("p1_firewall_used").default(false),
  p1TimeHackUsed: boolean("p1_time_hack_used").default(false),
  p1VirusUsed: boolean("p1_virus_used").default(false),
  p1BruteforceUsed: boolean("p1_bruteforce_used").default(false),
  p1ChangeDigitUsed: boolean("p1_change_digit_used").default(false),
  p1SwapDigitsUsed: boolean("p1_swap_digits_used").default(false),
  p1EmpUsed: boolean("p1_emp_used").default(false), // NEW
  p1SpywareUsed: boolean("p1_spyware_used").default(false), // NEW
  p1HoneypotUsed: boolean("p1_honeypot_used").default(false), // NEW

  // Player 2
  p2Code: text("p2_code"),
  p2Setup: boolean("p2_setup").default(false),
  p2FirewallUsed: boolean("p2_firewall_used").default(false),
  p2TimeHackUsed: boolean("p2_time_hack_used").default(false),
  p2VirusUsed: boolean("p2_virus_used").default(false),
  p2BruteforceUsed: boolean("p2_bruteforce_used").default(false),
  p2ChangeDigitUsed: boolean("p2_change_digit_used").default(false),
  p2SwapDigitsUsed: boolean("p2_swap_digits_used").default(false),
  p2EmpUsed: boolean("p2_emp_used").default(false), // NEW
  p2SpywareUsed: boolean("p2_spyware_used").default(false), // NEW
  p2HoneypotUsed: boolean("p2_honeypot_used").default(false), // NEW

  // --- STEALTH EFFECTS STATE ---
  p1Jammed: boolean("p1_jammed").default(false),
  p2Jammed: boolean("p2_jammed").default(false),
  p1Honeypoted: boolean("p1_honeypoted").default(false),
  p2Honeypoted: boolean("p2_honeypoted").default(false),
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
  timeLeft?: number; 
};
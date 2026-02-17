import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// 1v1 MODE SCHEMAS (DO NOT MODIFY)
// ==========================================

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  mode: text("mode").notNull().default("normal"),
  status: text("status").notNull().default("waiting"),
  turn: text("turn").notNull().default("p1"),
  turnStartedAt: timestamp("turn_started_at").defaultNow(),
  turnCount: integer("turn_count").default(0),
  winner: text("winner"),
  
  nextGlitchTurn: integer("next_glitch_turn").default(3),

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
  allowPhishing: boolean("allow_phishing").default(false), // NEW

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
  p1PhishingUsed: boolean("p1_phishing_used").default(false), // NEW

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
  p2PhishingUsed: boolean("p2_phishing_used").default(false), // NEW

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
  isCorrupted: boolean("is_corrupted").default(false),
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

// ==========================================
// NEW: MULTIPLAYER PARTY MODE SCHEMAS
// ==========================================

export const partyGames = pgTable("party_games", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  subMode: text("sub_mode").notNull().default("free_for_all"), // 'free_for_all', 'battle_royale', 'king_of_the_hill'
  status: text("status").notNull().default("waiting"), // 'waiting', 'playing', 'finished'
  maxPlayers: integer("max_players").notNull().default(6),
  
  // Turn System
  activePlayerId: integer("active_player_id"), // Who is currently guessing
  turnOrder: text("turn_order"), // JSON array of player IDs for clockwise rotation e.g., "[1, 4, 5]"
  turnStartedAt: timestamp("turn_started_at").defaultNow(),
  turnCount: integer("turn_count").default(0),
  
  // Special Mode State
  winCondition: text("win_condition").default("elimination"), // 'points' or 'elimination' (For FFA)
  targetPoints: integer("target_points").default(10), // For point-based FFA
  kingId: integer("king_id"), // For King of The Hill
  winnerId: integer("winner_id"), // Final Winner
  
  // Party Custom Settings
  customTimer: boolean("custom_timer").default(false),
  allowFirewall: boolean("allow_firewall").default(true),
  allowVirus: boolean("allow_virus").default(true),
  allowBruteforce: boolean("allow_bruteforce").default(true),
  allowChangeDigit: boolean("allow_change_digit").default(true),
  allowSwapDigits: boolean("allow_swap_digits").default(true),
  allowEmp: boolean("allow_emp").default(false),
  allowSpyware: boolean("allow_spyware").default(false),
  allowHoneypot: boolean("allow_honeypot").default(false),
  allowPhishing: boolean("allow_phishing").default(false), // NEW

  createdAt: timestamp("created_at").defaultNow(),
});

export const partyPlayers = pgTable("party_players", {
  id: serial("id").primaryKey(),
  partyGameId: integer("party_game_id").notNull(),
  playerName: text("player_name").notNull(), // Player Name or Alias

  playerColor: text("player_color").notNull().default("#E879F9"),
  
  // Core Data
  code: text("code"),
  isSetup: boolean("is_setup").default(false),
  isEliminated: boolean("is_eliminated").default(false), // For Elimination & Battle Royale
  isGhost: boolean("is_ghost").default(false), // True = Eliminated but can use Sabotage Powerups (Battle Royale)
  
  // Game Mode Stats
  points: integer("points").default(0), // For FFA Points mode
  reignTime: integer("reign_time").default(0), // For King of the Hill
  successfulDefenses: integer("successful_defenses").default(0), // For King of the Hill
  
  // Powerup Arsenal (Tracked individually for dynamic players)
  firewallUsed: boolean("firewall_used").default(false),
  timeHackUsed: boolean("time_hack_used").default(false),
  virusUsed: boolean("virus_used").default(false),
  bruteforceUsed: boolean("bruteforce_used").default(false),
  changeDigitUsed: boolean("change_digit_used").default(false),
  swapDigitsUsed: boolean("swap_digits_used").default(false),
  empUsed: boolean("emp_used").default(false),
  spywareUsed: boolean("spyware_used").default(false),
  honeypotUsed: boolean("honeypot_used").default(false),
  phishingUsed: boolean("phishing_used").default(false), // NEW

  // Applied Status Effects (If someone attacks them)
  isFirewallActive: boolean("is_firewall_active").default(false),
  isJammed: boolean("is_jammed").default(false),
  isHoneypoted: boolean("is_honeypoted").default(false),

  joinedAt: timestamp("joined_at").defaultNow(),
});

export const partyGuesses = pgTable("party_guesses", {
  id: serial("id").primaryKey(),
  partyGameId: integer("party_game_id").notNull(),
  attackerId: integer("attacker_id").notNull(), // The player who guessed
  targetId: integer("target_id").notNull(), // The player who was attacked
  guess: text("guess").notNull(),
  hits: integer("hits").notNull(),
  blips: integer("blips").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const partyLogs = pgTable("party_logs", {
  id: serial("id").primaryKey(),
  partyGameId: integer("party_game_id").notNull(),
  type: text("type").notNull(), // success, error, warning
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isCorrupted: boolean("is_corrupted").default(false),
});

// Party Zod Schemas & Types
export const insertPartyGameSchema = createInsertSchema(partyGames);
export const insertPartyPlayerSchema = createInsertSchema(partyPlayers);
export const insertPartyGuessSchema = createInsertSchema(partyGuesses);
export const insertPartyLogSchema = createInsertSchema(partyLogs);

export type PartyGame = typeof partyGames.$inferSelect;
export type PartyPlayer = typeof partyPlayers.$inferSelect;
export type PartyGuess = typeof partyGuesses.$inferSelect;
export type PartyLog = typeof partyLogs.$inferSelect;

export type PartyGameStateResponse = PartyGame & {
  players: PartyPlayer[];
  guesses: PartyGuess[];
  timeLeft?: number;
};
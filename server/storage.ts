import { db } from "./db";
import { games, guesses, logs, type Game, type Guess } from "@shared/schema";
import { eq, lt, inArray, like, and } from "drizzle-orm";

export interface IStorage {
  createGame(mode?: string, customSettings?: any): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByRoomId(roomId: string): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game>;
  createGuess(guess: Omit<Guess, "id" | "createdAt">): Promise<Guess>;
  getGuesses(gameId: number): Promise<Guess[]>;
  createLog(log: any): Promise<any>;
  getLogs(gameId: number): Promise<any[]>;
  deletePlayerLogs(gameId: number, playerLabel: string): Promise<void>; 
  resetGame(gameId: number): Promise<void>; 
  cleanupOldGames(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createGame(mode: string = 'normal', customSettings?: any): Promise<Game> {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const insertData: any = { roomId, mode };
    
    if (mode === 'custom' && customSettings) {
        insertData.customTimer = customSettings.timer;
        insertData.allowFirewall = customSettings.firewall;
        insertData.allowVirus = customSettings.virus; 
        insertData.allowBruteforce = customSettings.bruteforce;
        insertData.allowChangeDigit = customSettings.changeDigit;
        insertData.allowSwapDigits = customSettings.swapDigits;
        insertData.allowEmp = customSettings.emp;
        insertData.allowSpyware = customSettings.spyware;
        insertData.allowHoneypot = customSettings.honeypot;
    }
    
    const [game] = await db.insert(games).values(insertData).returning();
    return game;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getGameByRoomId(roomId: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    return game;
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game> {
    const [updated] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return updated;
  }

  async createGuess(guess: Omit<Guess, "id" | "createdAt">): Promise<Guess> {
    const [newGuess] = await db.insert(guesses).values(guess).returning();
    return newGuess;
  }

  async getGuesses(gameId: number): Promise<Guess[]> {
    return await db.select().from(guesses).where(eq(guesses.gameId, gameId));
  }

  async createLog(log: any): Promise<any> {
    const [newLog] = await db.insert(logs).values(log).returning();
    return newLog;
  }

  async getLogs(gameId: number): Promise<any[]> {
    return await db.select().from(logs).where(eq(logs.gameId, gameId)).orderBy(logs.timestamp);
  }

  async deletePlayerLogs(gameId: number, playerLabel: string): Promise<void> {
    await db.delete(logs).where(and(eq(logs.gameId, gameId), like(logs.message, `%${playerLabel}%`)));
  }

  async resetGame(gameId: number): Promise<void> {
    await db.delete(guesses).where(eq(guesses.gameId, gameId));
    await db.delete(logs).where(eq(logs.gameId, gameId));

    await db.update(games).set({
      status: 'waiting', turn: 'p1', winner: null, turnCount: 0,
      isFirewallActive: false, isTimeHackActive: false, 
      p1Jammed: false, p2Jammed: false, p1Honeypoted: false, p2Honeypoted: false,
      p1Code: null, p1Setup: false, p1FirewallUsed: false, p1TimeHackUsed: false, p1VirusUsed: false, p1BruteforceUsed: false, p1ChangeDigitUsed: false, p1SwapDigitsUsed: false, p1EmpUsed: false, p1SpywareUsed: false, p1HoneypotUsed: false,
      p2Code: null, p2Setup: false, p2FirewallUsed: false, p2TimeHackUsed: false, p2VirusUsed: false, p2BruteforceUsed: false, p2ChangeDigitUsed: false, p2SwapDigitsUsed: false, p2EmpUsed: false, p2SpywareUsed: false, p2HoneypotUsed: false,
    }).where(eq(games.id, gameId));
  }

  async cleanupOldGames(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); 
    const oldGames = await db.select({ id: games.id }).from(games).where(lt(games.createdAt, oneDayAgo));
    const ids = oldGames.map(g => g.id);
    if (ids.length > 0) {
      await db.delete(logs).where(inArray(logs.gameId, ids));
      await db.delete(guesses).where(inArray(guesses.gameId, ids));
      await db.delete(games).where(inArray(games.id, ids));
    }
  }
}

export const storage = new DatabaseStorage();
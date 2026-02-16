import { db } from "./db";
import { 
  games, guesses, logs, type Game, type Guess,
  partyGames, partyPlayers, partyGuesses, partyLogs, 
  type PartyGame, type PartyPlayer, type PartyGuess, type PartyLog 
} from "@shared/schema";
import { eq, lt, inArray, like, and } from "drizzle-orm";

export interface IStorage {
  createGame(mode?: string, customSettings?: any): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByRoomId(roomId: string): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game>;
  createGuess(guess: Omit<Guess, "id" | "timestamp">): Promise<Guess>;
  getGuesses(gameId: number): Promise<Guess[]>;
  createLog(log: any): Promise<any>;
  getLogs(gameId: number): Promise<any[]>;
  deletePlayerLogs(gameId: number, playerLabel: string): Promise<void>; 
  resetGame(gameId: number): Promise<void>; 
  
  createPartyGame(subMode?: string, maxPlayers?: number, customSettings?: any, winCondition?: string, targetPoints?: number): Promise<PartyGame>;
  getPartyGame(id: number): Promise<PartyGame | undefined>;
  getPartyGameByRoomId(roomId: string): Promise<PartyGame | undefined>;
  updatePartyGame(id: number, updates: Partial<PartyGame>): Promise<PartyGame>;
  
  // FIXED: Added playerColor to the interface
  addPartyPlayer(partyGameId: number, playerName: string, playerColor?: string): Promise<PartyPlayer>;
  getPartyPlayer(id: number): Promise<PartyPlayer | undefined>;
  getPartyPlayers(partyGameId: number): Promise<PartyPlayer[]>;
  updatePartyPlayer(id: number, updates: Partial<PartyPlayer>): Promise<PartyPlayer>;
  
  createPartyGuess(guess: Omit<PartyGuess, "id" | "timestamp">): Promise<PartyGuess>;
  getPartyGuesses(partyGameId: number): Promise<PartyGuess[]>;
  
  createPartyLog(log: Omit<PartyLog, "id" | "timestamp">): Promise<PartyLog>;
  getPartyLogs(partyGameId: number): Promise<PartyLog[]>;
  clearPartyLogs(partyGameId: number): Promise<void>;

  restartPartyGame(partyGameId: number): Promise<void>;
  cleanupOldGames(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  async createGame(mode: string = 'normal', customSettings?: any): Promise<Game> {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const insertData: any = { roomId, mode };
    if (mode === 'glitch') {
        insertData.nextGlitchTurn = Math.floor(Math.random() * 6) + 3; 
    }
    if (mode === 'custom' && customSettings) {
        insertData.customTimer = customSettings.timer; insertData.allowFirewall = customSettings.firewall; insertData.allowVirus = customSettings.virus; insertData.allowBruteforce = customSettings.bruteforce; insertData.allowChangeDigit = customSettings.changeDigit; insertData.allowSwapDigits = customSettings.swapDigits; insertData.allowEmp = customSettings.emp; insertData.allowSpyware = customSettings.spyware; insertData.allowHoneypot = customSettings.honeypot;
    }
    const [game] = await db.insert(games).values(insertData).returning(); return game;
  }
  async getGame(id: number): Promise<Game | undefined> { const [game] = await db.select().from(games).where(eq(games.id, id)); return game; }
  async getGameByRoomId(roomId: string): Promise<Game | undefined> { const [game] = await db.select().from(games).where(eq(games.roomId, roomId)); return game; }
  async updateGame(id: number, updates: Partial<Game>): Promise<Game> { const [updated] = await db.update(games).set(updates).where(eq(games.id, id)).returning(); return updated; }
  async createGuess(guess: any): Promise<Guess> { const [newGuess] = await db.insert(guesses).values(guess).returning(); return newGuess; }
  async getGuesses(gameId: number): Promise<Guess[]> { return await db.select().from(guesses).where(eq(guesses.gameId, gameId)); }
  async createLog(log: any): Promise<any> { const [newLog] = await db.insert(logs).values(log).returning(); return newLog; }
  async getLogs(gameId: number): Promise<any[]> { return await db.select().from(logs).where(eq(logs.gameId, gameId)).orderBy(logs.timestamp); }
  async deletePlayerLogs(gameId: number, playerLabel: string): Promise<void> { await db.delete(logs).where(and(eq(logs.gameId, gameId), like(logs.message, `%${playerLabel}%`))); }
  async resetGame(gameId: number): Promise<void> {
    await db.delete(guesses).where(eq(guesses.gameId, gameId)); await db.delete(logs).where(eq(logs.gameId, gameId));
    await db.update(games).set({ status: 'waiting', turn: 'p1', winner: null, turnCount: 0, nextGlitchTurn: Math.floor(Math.random() * 6) + 3, isFirewallActive: false, isTimeHackActive: false, p1Jammed: false, p2Jammed: false, p1Honeypoted: false, p2Honeypoted: false, p1Code: null, p1Setup: false, p1FirewallUsed: false, p1TimeHackUsed: false, p1VirusUsed: false, p1BruteforceUsed: false, p1ChangeDigitUsed: false, p1SwapDigitsUsed: false, p1EmpUsed: false, p1SpywareUsed: false, p1HoneypotUsed: false, p2Code: null, p2Setup: false, p2FirewallUsed: false, p2TimeHackUsed: false, p2VirusUsed: false, p2BruteforceUsed: false, p2ChangeDigitUsed: false, p2SwapDigitsUsed: false, p2EmpUsed: false, p2SpywareUsed: false, p2HoneypotUsed: false }).where(eq(games.id, gameId));
  }

  async createPartyGame(subMode: string = 'free_for_all', maxPlayers: number = 6, customSettings?: any, winCondition?: string, targetPoints?: number): Promise<PartyGame> {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const insertData: any = { roomId, subMode, maxPlayers };
    if (winCondition) insertData.winCondition = winCondition;
    if (targetPoints) insertData.targetPoints = targetPoints;
    if (customSettings) { insertData.customTimer = customSettings.timer; insertData.allowFirewall = customSettings.firewall; insertData.allowVirus = customSettings.virus; insertData.allowBruteforce = customSettings.bruteforce; insertData.allowChangeDigit = customSettings.changeDigit; insertData.allowSwapDigits = customSettings.swapDigits; insertData.allowEmp = customSettings.emp; insertData.allowSpyware = customSettings.spyware; insertData.allowHoneypot = customSettings.honeypot; }
    const [game] = await db.insert(partyGames).values(insertData).returning(); return game;
  }
  async getPartyGame(id: number): Promise<PartyGame | undefined> { const [game] = await db.select().from(partyGames).where(eq(partyGames.id, id)); return game; }
  async getPartyGameByRoomId(roomId: string): Promise<PartyGame | undefined> { const [game] = await db.select().from(partyGames).where(eq(partyGames.roomId, roomId)); return game; }
  async updatePartyGame(id: number, updates: Partial<PartyGame>): Promise<PartyGame> { const [updated] = await db.update(partyGames).set(updates).where(eq(partyGames.id, id)).returning(); return updated; }
  
  // FIXED: Added playerColor argument and included it in the db insert
  async addPartyPlayer(partyGameId: number, playerName: string, playerColor: string = "#E879F9"): Promise<PartyPlayer> { 
    const [player] = await db.insert(partyPlayers).values({ partyGameId, playerName, playerColor }).returning(); 
    return player; 
  }

  async getPartyPlayer(id: number): Promise<PartyPlayer | undefined> { const [player] = await db.select().from(partyPlayers).where(eq(partyPlayers.id, id)); return player; }
  async getPartyPlayers(partyGameId: number): Promise<PartyPlayer[]> { return await db.select().from(partyPlayers).where(eq(partyPlayers.partyGameId, partyGameId)).orderBy(partyPlayers.joinedAt); }
  async updatePartyPlayer(id: number, updates: Partial<PartyPlayer>): Promise<PartyPlayer> { const [updated] = await db.update(partyPlayers).set(updates).where(eq(partyPlayers.id, id)).returning(); return updated; }
  async createPartyGuess(guess: any): Promise<PartyGuess> { const [newGuess] = await db.insert(partyGuesses).values(guess).returning(); return newGuess; }
  async getPartyGuesses(partyGameId: number): Promise<PartyGuess[]> { return await db.select().from(partyGuesses).where(eq(partyGuesses.partyGameId, partyGameId)); }
  async createPartyLog(log: any): Promise<PartyLog> { const [newLog] = await db.insert(partyLogs).values(log).returning(); return newLog; }
  async getPartyLogs(partyGameId: number): Promise<PartyLog[]> { return await db.select().from(partyLogs).where(eq(partyLogs.partyGameId, partyGameId)).orderBy(partyLogs.timestamp); }
  
  async clearPartyLogs(partyGameId: number): Promise<void> {
    await db.delete(partyLogs).where(eq(partyLogs.partyGameId, partyGameId));
  }

  // --- RESTART FIXED ---
  async restartPartyGame(partyGameId: number): Promise<void> {
    await db.delete(partyGuesses).where(eq(partyGuesses.partyGameId, partyGameId));
    await db.delete(partyLogs).where(eq(partyLogs.partyGameId, partyGameId));

    await db.update(partyGames).set({
        status: 'waiting', turnCount: 0, winnerId: null, activePlayerId: null, turnOrder: null, kingId: null
    }).where(eq(partyGames.id, partyGameId));

    await db.update(partyPlayers).set({
        code: null, isSetup: false, isEliminated: false, isGhost: false, points: 0, reignTime: 0, successfulDefenses: 0,
        firewallUsed: false, timeHackUsed: false, virusUsed: false, bruteforceUsed: false, changeDigitUsed: false, swapDigitsUsed: false, empUsed: false, spywareUsed: false, honeypotUsed: false,
        isFirewallActive: false, isJammed: false, isHoneypoted: false
    }).where(eq(partyPlayers.partyGameId, partyGameId));
  }

  async cleanupOldGames(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); 
    const oldGames = await db.select({ id: games.id }).from(games).where(lt(games.createdAt, oneDayAgo));
    const ids = oldGames.map(g => g.id);
    if (ids.length > 0) { await db.delete(logs).where(inArray(logs.gameId, ids)); await db.delete(guesses).where(inArray(guesses.gameId, ids)); await db.delete(games).where(inArray(games.id, ids)); }
    const oldPartyGames = await db.select({ id: partyGames.id }).from(partyGames).where(lt(partyGames.createdAt, oneDayAgo));
    const partyIds = oldPartyGames.map(g => g.id);
    if (partyIds.length > 0) { await db.delete(partyLogs).where(inArray(partyLogs.partyGameId, partyIds)); await db.delete(partyGuesses).where(inArray(partyGuesses.partyGameId, partyIds)); await db.delete(partyPlayers).where(inArray(partyPlayers.partyGameId, partyIds)); await db.delete(partyGames).where(inArray(partyGames.id, partyIds)); }
  }
}
export const storage = new DatabaseStorage();
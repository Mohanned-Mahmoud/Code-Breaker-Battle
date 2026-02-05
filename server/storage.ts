import { db } from "./db";
import { games, guesses, type Game, type Guess, type CreateGameRequest, type SetupGameRequest, type MakeGuessRequest, type UsePowerupRequest } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  createGame(): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game>;
  
  createGuess(guess: Omit<Guess, "id" | "createdAt">): Promise<Guess>;
  getGuesses(gameId: number): Promise<Guess[]>;
  createLog(log: any): Promise<any>;
  getLogs(gameId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async createGame(): Promise<Game> {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const [game] = await db.insert(games).values({ roomId }).returning();
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
    const [updated] = await db.update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
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
    const [newLog] = await db.insert(gameLogs).values(log).returning();
    return newLog;
  }

  async getLogs(gameId: number): Promise<any[]> {
    return await db.select().from(gameLogs).where(eq(gameLogs.gameId, gameId)).orderBy(gameLogs.timestamp);
  }
}

export const storage = new DatabaseStorage();

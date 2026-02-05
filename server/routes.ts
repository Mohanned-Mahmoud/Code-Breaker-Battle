import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { GameStateResponse } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Helper to calculate hits and blips
  function calculateFeedback(secret: string, guess: string) {
    let hits = 0;
    let blips = 0;
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    const secretUsed = new Array(4).fill(false);
    const guessUsed = new Array(4).fill(false);

    // Calculate Hits (Correct number, correct spot)
    for (let i = 0; i < 4; i++) {
      if (guessArr[i] === secretArr[i]) {
        hits++;
        secretUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    // Calculate Blips (Correct number, wrong spot)
    for (let i = 0; i < 4; i++) {
      if (!guessUsed[i]) {
        for (let j = 0; j < 4; j++) {
          if (!secretUsed[j] && guessArr[i] === secretArr[j]) {
            blips++;
            secretUsed[j] = true;
            break;
          }
        }
      }
    }

    return { hits, blips };
  }

  // 1. Create Game
  app.post(api.games.create.path, async (req, res) => {
    const game = await storage.createGame();
    res.status(201).json({ id: game.id });
  });

  // 2. Get Game State
  app.get(api.games.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    const guesses = await storage.getGuesses(id);

    // هنا كان الخطأ: ضفنا p1Code و p2Code بـ null عشان نرضي الـ TypeScript ونحافظ على السرية
    const response: GameStateResponse = {
      id: game.id,
      status: game.status as 'setup' | 'playing' | 'finished',
      turn: game.turn as 'p1' | 'p2',
      winner: game.winner as 'p1' | 'p2' | null,
      p1Setup: !!game.p1Code,
      p2Setup: !!game.p2Code,
      p1Code: null, // SECURITY: Always send null to client
      p2Code: null, // SECURITY: Always send null to client
      p1FirewallUsed: game.p1FirewallUsed ?? false,
      p1BruteforceUsed: game.p1BruteforceUsed ?? false,
      p2FirewallUsed: game.p2FirewallUsed ?? false,
      p2BruteforceUsed: game.p2BruteforceUsed ?? false,
      guesses,
    };

    res.json(response);
  });

  // 3. Setup Game (Choose Code)
  app.post(api.games.setup.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, code } = api.games.setup.input.parse(req.body);
      
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      if (game.status !== 'setup') return res.status(400).json({ message: 'Game already started' });

      const updates: any = {};
      if (player === 'p1') updates.p1Code = code;
      else updates.p2Code = code;

      const isP1Ready = player === 'p1' ? true : !!game.p1Code;
      const isP2Ready = player === 'p2' ? true : !!game.p2Code;

      if (isP1Ready && isP2Ready) {
        updates.status = 'playing';
        updates.turn = 'p1';
      }

      await storage.updateGame(id, updates);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // 4. Make a Guess
  app.post(api.games.guess.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, guess } = api.games.guess.input.parse(req.body);

      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      if (game.status !== 'playing') return res.status(400).json({ message: 'Game not in progress' });
      if (game.turn !== player) return res.status(400).json({ message: 'Not your turn' });

      const targetCode = player === 'p1' ? game.p2Code : game.p1Code;
      if (!targetCode) return res.status(500).json({ message: 'Game state error' });

      const { hits, blips } = calculateFeedback(targetCode, guess);

      await storage.createGuess({
        gameId: id,
        player,
        guess,
        hits,
        blips,
        timestamp: new Date()
      });

      await storage.createLog({
        gameId: id,
        message: `ATTEMPT: ${guess} | D:${hits} N:${blips}`,
        type: hits === 4 ? 'success' : hits > 0 ? 'warning' : 'info'
      });

      const updates: any = {};
      
      if (hits === 4) {
        updates.status = 'finished';
        updates.winner = player;
      } else {
        updates.turn = player === 'p1' ? 'p2' : 'p1';
      }

      await storage.updateGame(id, updates);
      res.json({ hits, blips });
    } catch (err) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // 5. Get Logs
  app.get(api.games.logs.path, async (req, res) => {
    const id = Number(req.params.id);
    const logs = await storage.getLogs(id);
    res.json(logs);
  });

  // 6. USE POWERUP
  app.post(api.games.powerup.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, type } = req.body; 

      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      if (game.status !== 'playing') return res.status(400).json({ message: 'Game not in progress' });
      if (game.turn !== player) return res.status(400).json({ message: 'Not your turn' });

      const updates: any = {};
      let logMessage = "";

      // --- FIREWALL LOGIC ---
      if (type === 'firewall') {
        if ((player === 'p1' && game.p1FirewallUsed) || (player === 'p2' && game.p2FirewallUsed)) {
          return res.status(400).json({ message: 'Ability already used' });
        }
        
        updates[player === 'p1' ? 'p1FirewallUsed' : 'p2FirewallUsed'] = true;
        logMessage = `PLAYER ${player === 'p1' ? '01' : '02'} ACTIVATED FIREWALL. TURN EXTENDED.`;
      } 
      // --- BRUTEFORCE LOGIC ---
      else if (type === 'bruteforce') {
        if ((player === 'p1' && game.p1BruteforceUsed) || (player === 'p2' && game.p2BruteforceUsed)) {
          return res.status(400).json({ message: 'Ability already used' });
        }

        const opponentCode = player === 'p1' ? game.p2Code : game.p1Code;
        if (!opponentCode) return res.status(500).json({ message: 'Opponent code missing' });
        
        // Reveal the first digit
        const revealedDigit = opponentCode[0];
        updates[player === 'p1' ? 'p1BruteforceUsed' : 'p2BruteforceUsed'] = true;
        logMessage = `BRUTEFORCE ATTACK SUCCESSFUL. FIRST DIGIT EXPOSED: [ ${revealedDigit} * * * ]`;
      }

      await storage.updateGame(id, updates);
      
      if (logMessage) {
        await storage.createLog({
            gameId: id,
            message: logMessage,
            type: 'warning'
        });
      }
      
      const updatedGame = await storage.getGame(id);
      res.json(updatedGame);

    } catch (err) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  return httpServer;
}
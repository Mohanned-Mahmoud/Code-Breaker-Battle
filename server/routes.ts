import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { z } from "zod";
import { GameStateResponse } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  function calculateFeedback(secret: string, guess: string) {
    let hits = 0;
    let blips = 0;
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    const secretUsed = new Array(4).fill(false);
    const guessUsed = new Array(4).fill(false);

    for (let i = 0; i < 4; i++) {
      if (guessArr[i] === secretArr[i]) {
        hits++;
        secretUsed[i] = true;
        guessUsed[i] = true;
      }
    }

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

    const response: GameStateResponse = {
      id: game.id,
      roomId: game.roomId,
      status: game.status as 'waiting' | 'setup' | 'playing' | 'finished',
      turn: game.turn as 'p1' | 'p2',
      winner: game.winner as 'p1' | 'p2' | null,
      isFirewallActive: game.isFirewallActive ?? false,
      
      // Ensure createdAt is included (fallback to now if missing)
      createdAt: game.createdAt ?? new Date(), 
      
      p1Setup: game.p1Setup ?? false,
      p2Setup: game.p2Setup ?? false,
      p1Code: null,
      p2Code: null,
      p1FirewallUsed: game.p1FirewallUsed ?? false,
      p1BruteforceUsed: game.p1BruteforceUsed ?? false,
      p2FirewallUsed: game.p2FirewallUsed ?? false,
      p2BruteforceUsed: game.p2BruteforceUsed ?? false,
      guesses,
    };

    res.json(response);
  });

  // 3. Setup Game
  app.post(api.games.setup.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, code } = api.games.setup.input.parse(req.body);
      
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      
      const updates: any = {};
      if (player === 'p1') {
        updates.p1Code = code;
        updates.p1Setup = true;
      } else {
        updates.p2Code = code;
        updates.p2Setup = true;
      }

      const isP1Ready = player === 'p1' ? true : game.p1Setup;
      const isP2Ready = player === 'p2' ? true : game.p2Setup;

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

      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';
      await storage.createLog({
        gameId: id,
        message: `${playerLabel} CODE: ${guess} >> HITS: ${hits} | CLOSE: ${blips}`,
        type: hits === 4 ? 'success' : 'info'
      });

      const updates: any = {};
      if (hits === 4) {
        updates.status = 'finished';
        updates.winner = player;
      } else {
        if (game.isFirewallActive) {
          updates.isFirewallActive = false;
          await storage.createLog({
            gameId: id,
            message: `SYSTEM: FIREWALL BLOCKED TURN SWITCH. ${playerLabel} GOES AGAIN.`,
            type: 'warning'
          });
        } else {
          updates.turn = player === 'p1' ? 'p2' : 'p1';
        }
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
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';

      if (type === 'firewall') {
        if ((player === 'p1' && game.p1FirewallUsed) || (player === 'p2' && game.p2FirewallUsed)) {
          return res.status(400).json({ message: 'Ability already used' });
        }
        updates[player === 'p1' ? 'p1FirewallUsed' : 'p2FirewallUsed'] = true;
        updates.isFirewallActive = true; 
        logMessage = `${playerLabel} ACTIVATED FIREWALL. TURN EXTENDED.`;
      } 
      else if (type === 'bruteforce') {
        if ((player === 'p1' && game.p1BruteforceUsed) || (player === 'p2' && game.p2BruteforceUsed)) {
          return res.status(400).json({ message: 'Ability already used' });
        }
        const opponentCode = player === 'p1' ? game.p2Code : game.p1Code;
        if (!opponentCode) return res.status(500).json({ message: 'Opponent code missing' });
        
        const revealedDigit = opponentCode[0];
        updates[player === 'p1' ? 'p1BruteforceUsed' : 'p2BruteforceUsed'] = true;
        logMessage = `${playerLabel} USED BRUTEFORCE. 1ST DIGIT IS [ ${revealedDigit} ]`;
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

  // 7. RESTART GAME ROUTE (NEW)
  app.post('/api/games/:id/restart', async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    await storage.resetGame(id);
    
    // Create a log indicating restart
    await storage.createLog({
      gameId: id,
      message: "SYSTEM: RESTART SEQUENCE INITIATED. MEMORY CLEARED.",
      type: "warning"
    });

    res.json({ success: true });
  });

  return httpServer;
}
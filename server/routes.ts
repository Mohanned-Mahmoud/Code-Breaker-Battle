import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { GameStateResponse } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  function calculateFeedback(secret: string, guess: string) {
    let hits = 0; let blips = 0;
    const secretArr = secret.split(''); const guessArr = guess.split('');
    const secretUsed = new Array(4).fill(false); const guessUsed = new Array(4).fill(false);
    for (let i = 0; i < 4; i++) { if (guessArr[i] === secretArr[i]) { hits++; secretUsed[i] = true; guessUsed[i] = true; } }
    for (let i = 0; i < 4; i++) {
      if (!guessUsed[i]) {
        for (let j = 0; j < 4; j++) { if (!secretUsed[j] && guessArr[i] === secretArr[j]) { blips++; secretUsed[j] = true; break; } }
      }
    }
    return { hits, blips };
  }

  app.post(api.games.create.path, async (req, res) => {
    const mode = req.body?.mode || 'normal';
    const game = await storage.createGame(mode);
    res.status(201).json({ id: game.id });
  });

  app.get(api.games.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    
    const guesses = await storage.getGuesses(id);
    let timeLeft = 0;
    if (game.mode === 'blitz' && game.status === 'playing') {
       const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
       const elapsed = Math.floor((new Date().getTime() - turnStart) / 1000);
       timeLeft = Math.max(0, 30 - elapsed);
    }

    const response: GameStateResponse = {
      ...game,
      status: game.status as any,
      turn: game.turn as any,
      winner: game.winner as any,
      p1TimeHackUsed: game.p1TimeHackUsed ?? false, // Expose status
      p2TimeHackUsed: game.p2TimeHackUsed ?? false,
      guesses,
      timeLeft
    };
    res.json(response);
  });

  app.get('/api/games/:id/code/:player', async (req, res) => {
    const id = Number(req.params.id); const player = req.params.player;
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json({ code: player === 'p1' ? game.p1Code : game.p2Code });
  });

  app.post(api.games.setup.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, code } = api.games.setup.input.parse(req.body);
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      
      const updates: any = {};
      if (player === 'p1') { updates.p1Code = code; updates.p1Setup = true; } 
      else { updates.p2Code = code; updates.p2Setup = true; }

      const isP1Ready = player === 'p1' ? true : game.p1Setup;
      const isP2Ready = player === 'p2' ? true : game.p2Setup;

      if (isP1Ready && isP2Ready) {
        updates.status = 'playing'; updates.turn = 'p1'; updates.turnStartedAt = new Date();
      }
      await storage.updateGame(id, updates);
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });

  app.post(api.games.guess.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, guess } = api.games.guess.input.parse(req.body);
      const game = await storage.getGame(id);
      if (!game || game.status !== 'playing' || game.turn !== player) return res.status(400).json({ message: 'Invalid' });

      const targetCode = player === 'p1' ? game.p2Code : game.p1Code;
      const { hits, blips } = calculateFeedback(targetCode!, guess);
      await storage.createGuess({ gameId: id, player, guess, hits, blips, timestamp: new Date() });

      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';
      await storage.createLog({
        gameId: id, message: `${playerLabel} CODE: ${guess} >> HITS: ${hits} | CLOSE: ${blips}`,
        type: hits === 4 ? 'success' : 'info'
      });

      const updates: any = {};
      if (hits === 4) {
        updates.status = 'finished'; updates.winner = player;
      } else {
        if (game.isFirewallActive) {
          updates.isFirewallActive = false; updates.turnStartedAt = new Date();
          await storage.createLog({ gameId: id, message: `SYSTEM: FIREWALL EXTENDED ${playerLabel} TURN.`, type: 'warning' });
        } else {
          updates.turn = player === 'p1' ? 'p2' : 'p1';
          // --- خصم الـ 20 ثانية من الخصم هنا ---
          if (game.isTimeHackActive) {
             updates.turnStartedAt = new Date(Date.now() - 20000); // 20 seconds penalty!
             updates.isTimeHackActive = false;
          } else {
             updates.turnStartedAt = new Date();
          }
        }
      }
      await storage.updateGame(id, updates);
      res.json({ hits, blips });
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });

  app.post(api.games.timeout.path, async (req, res) => {
    try {
      const id = Number(req.params.id); const { player } = req.body;
      const game = await storage.getGame(id);
      if (!game || game.status !== 'playing' || game.turn !== player || game.mode !== 'blitz') return res.status(400).json({ message: 'Invalid' });

      const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
      const elapsed = (new Date().getTime() - turnStart) / 1000;
      if (elapsed < 28) return res.status(400).json({ message: 'Not timed out yet' });

      const nextTurn = player === 'p1' ? 'p2' : 'p1';
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';

      await storage.createLog({ gameId: id, message: `SYSTEM: ${playerLabel} CONNECTION TIMED OUT. TURN SKIPPED.`, type: 'error' });

      const updates: any = { turn: nextTurn, isFirewallActive: false };
      // --- خصم الـ 20 ثانية من الخصم حتى لو انتهى وقتك ولم تخمن ---
      if (game.isTimeHackActive) {
          updates.turnStartedAt = new Date(Date.now() - 20000); 
          updates.isTimeHackActive = false;
      } else {
          updates.turnStartedAt = new Date();
      }
      await storage.updateGame(id, updates);
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error' }); }
  });

  app.get(api.games.logs.path, async (req, res) => { res.json(await storage.getLogs(Number(req.params.id))); });

  app.post(api.games.powerup.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { player, type, targetIndex, newDigit, swapIndex1, swapIndex2 } = req.body; 
      const game = await storage.getGame(id);
      if (!game || game.status !== 'playing' || game.turn !== player) return res.status(400).json({ message: 'Invalid' });

      const updates: any = {}; let logMessage = "";
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';
      const myCode = player === 'p1' ? game.p1Code : game.p2Code;

      if (type === 'firewall') {
        if ((player === 'p1' && game.p1FirewallUsed) || (player === 'p2' && game.p2FirewallUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1FirewallUsed' : 'p2FirewallUsed'] = true; updates.isFirewallActive = true; 
        logMessage = `${playerLabel} ACTIVATED FIREWALL. TURN EXTENDED.`;
      } 
      // --- قدرة الـ DDOS الجديدة الخاصة بطور الـ Blitz ---
      else if (type === 'timeHack') {
        if (game.mode !== 'blitz') return res.status(400).json({ message: 'Only available in Blitz mode' });
        if ((player === 'p1' && game.p1TimeHackUsed) || (player === 'p2' && game.p2TimeHackUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1TimeHackUsed' : 'p2TimeHackUsed'] = true;
        updates.isTimeHackActive = true; 
        logMessage = `WARNING: ${playerLabel} LAUNCHED DDOS ATTACK! OPPONENT'S NEXT TURN REDUCED BY 20s.`;
      }
      else if (type === 'bruteforce') {
        if ((player === 'p1' && game.p1BruteforceUsed) || (player === 'p2' && game.p2BruteforceUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1BruteforceUsed' : 'p2BruteforceUsed'] = true;
        logMessage = `${playerLabel} USED BRUTEFORCE. 1ST DIGIT IS [ ${(player === 'p1' ? game.p2Code : game.p1Code)![0]} ]`;
      }
      else if (type === 'changeDigit') {
        if ((player === 'p1' && game.p1ChangeDigitUsed) || (player === 'p2' && game.p2ChangeDigitUsed)) return res.status(400).json({ message: 'Used' });
        let codeArr = myCode!.split(''); codeArr[targetIndex] = newDigit.toString();
        updates[player === 'p1' ? 'p1Code' : 'p2Code'] = codeArr.join('');
        updates[player === 'p1' ? 'p1ChangeDigitUsed' : 'p2ChangeDigitUsed'] = true;
        logMessage = `SYSTEM: ${playerLabel} MUTATED THEIR MASTER CODE.`;
      }
      else if (type === 'swapDigits') {
        if ((player === 'p1' && game.p1SwapDigitsUsed) || (player === 'p2' && game.p2SwapDigitsUsed)) return res.status(400).json({ message: 'Used' });
        let codeArr = myCode!.split(''); let temp = codeArr[swapIndex1]; codeArr[swapIndex1] = codeArr[swapIndex2]; codeArr[swapIndex2] = temp;
        updates[player === 'p1' ? 'p1Code' : 'p2Code'] = codeArr.join('');
        updates[player === 'p1' ? 'p1SwapDigitsUsed' : 'p2SwapDigitsUsed'] = true;
        logMessage = `SYSTEM: ${playerLabel} SHUFFLED THEIR MASTER CODE.`;
      }

      updates.turnStartedAt = new Date(); // Reset timer so they have full time after powerup
      await storage.updateGame(id, updates);
      if (logMessage) await storage.createLog({ gameId: id, message: logMessage, type: 'warning' });
      res.json(await storage.getGame(id));
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });

  app.post('/api/games/:id/restart', async (req, res) => {
    const id = Number(req.params.id);
    await storage.resetGame(id);
    await storage.createLog({ gameId: id, message: "SYSTEM: RESTART SEQUENCE INITIATED.", type: "warning" });
    res.json({ success: true });
  });

  return httpServer;
}
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

  function shuffleString(str: string) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  app.post(api.games.create.path, async (req, res) => {
    const mode = req.body?.mode || 'normal';
    const customSettings = req.body?.customSettings;
    const game = await storage.createGame(mode, customSettings);
    res.status(201).json({ id: game.id });
  });

  app.get(api.games.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    
    const guesses = await storage.getGuesses(id);
    let timeLeft = 0;
    
    const isTimed = game.mode === 'blitz' || (game.mode === 'custom' && game.customTimer);
    if (isTimed && game.status === 'playing') {
       const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
       const elapsed = Math.floor((new Date().getTime() - turnStart) / 1000);
       timeLeft = Math.max(0, 30 - elapsed);
    }

    const response: GameStateResponse = {
      ...game,
      status: game.status as any,
      turn: game.turn as any,
      winner: game.winner as any,
      p1TimeHackUsed: game.p1TimeHackUsed ?? false, 
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
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';
      const updates: any = {};

      // --- LOGIC FOR STEALTH POWERUPS (EMP & HONEYPOT) ---
      let displayHits = hits;
      let displayBlips = blips;
      let isJammed = player === 'p1' ? game.p1Jammed : game.p2Jammed;
      let isHoneypoted = player === 'p1' ? game.p1Honeypoted : game.p2Honeypoted;

      if (hits !== 4) { // إذا كسر الكود فعلياً، لا نمنعه من الفوز
          if (isJammed) {
              displayHits = -1; displayBlips = -1; // -1 means Corrupted
              updates[player === 'p1' ? 'p1Jammed' : 'p2Jammed'] = false;
          } else if (isHoneypoted) {
              // نظام التزييف (المصيدة): نعطيه أرقام كاذبة ومقنعة لكي يصدقها!
              displayHits = hits > 0 ? 0 : 1; 
              displayBlips = blips > 0 ? 0 : (hits === 0 ? 2 : 1);
              updates[player === 'p1' ? 'p1Honeypoted' : 'p2Honeypoted'] = false;
          }
      }

      await storage.createGuess({ gameId: id, player, guess, hits: displayHits, blips: displayBlips, timestamp: new Date() });

      let logStr = "";
      if (displayHits === -1) {
          logStr = `${playerLabel} CODE: ${guess} >> HITS: ░░ | CLOSE: ░░ [SIGNAL JAMMED]`;
      } else {
          logStr = `${playerLabel} CODE: ${guess} >> HITS: ${displayHits} | CLOSE: ${displayBlips}`;
      }

      await storage.createLog({
        gameId: id, message: logStr,
        type: hits === 4 ? 'success' : (isJammed ? 'error' : 'info')
      });

      let currentTurnCount = (game.turnCount || 0) + 1;
      updates.turnCount = currentTurnCount;

      if (hits === 4) {
        updates.status = 'finished'; updates.winner = player;
      } else {

        if (game.mode === 'glitch' && currentTurnCount % 3 === 0) {
            const glitchType = Math.floor(Math.random() * 3);
            if (glitchType === 0) {
                updates.p1Code = shuffleString(game.p1Code!); updates.p2Code = shuffleString(game.p2Code!);
                await storage.createLog({ gameId: id, message: `[GLITCH] SYSTEM REBOOT: ALL MASTER CODES SHUFFLED!`, type: 'error' });
            } else if (glitchType === 1) {
                updates.p1FirewallUsed = false; updates.p1TimeHackUsed = false; updates.p1VirusUsed = false; updates.p1BruteforceUsed = false; updates.p1ChangeDigitUsed = false; updates.p1SwapDigitsUsed = false; updates.p1EmpUsed = false; updates.p1SpywareUsed = false; updates.p1HoneypotUsed = false;
                updates.p2FirewallUsed = false; updates.p2TimeHackUsed = false; updates.p2VirusUsed = false; updates.p2BruteforceUsed = false; updates.p2ChangeDigitUsed = false; updates.p2SwapDigitsUsed = false; updates.p2EmpUsed = false; updates.p2SpywareUsed = false; updates.p2HoneypotUsed = false;
                await storage.createLog({ gameId: id, message: `[GLITCH] FIREWALL DOWN: ALL POWERUPS RESTORED!`, type: 'error' });
            } else {
                const r1 = Math.floor(Math.random() * 10).toString(); const r2 = Math.floor(Math.random() * 10).toString();
                updates.p1Code = r1 + game.p1Code!.substring(1); updates.p2Code = r2 + game.p2Code!.substring(1);
                await storage.createLog({ gameId: id, message: `[GLITCH] DATA CORRUPTION: 1ST DIGIT MUTATED FOR BOTH PLAYERS!`, type: 'error' });
            }
        }

        if (game.isFirewallActive) {
          updates.isFirewallActive = false; updates.turnStartedAt = new Date();
          await storage.createLog({ gameId: id, message: `SYSTEM: FIREWALL EXTENDED ${playerLabel} TURN.`, type: 'warning' });
        } else {
          updates.turn = player === 'p1' ? 'p2' : 'p1';
          if (game.isTimeHackActive) {
             updates.turnStartedAt = new Date(Date.now() - 20000); 
             updates.isTimeHackActive = false;
          } else {
             updates.turnStartedAt = new Date();
          }
        }
      }
      await storage.updateGame(id, updates);
      res.json({ hits, blips }); // نرسل الأرقام الحقيقية في الـ response لكن اللوج يسجل المزيفة
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });

  app.post(api.games.timeout.path, async (req, res) => {
    try {
      const id = Number(req.params.id); const { player } = req.body;
      const game = await storage.getGame(id);
      
      const isTimed = game?.mode === 'blitz' || (game?.mode === 'custom' && game?.customTimer);
      if (!game || game.status !== 'playing' || game.turn !== player || !isTimed) return res.status(400).json({ message: 'Invalid' });

      const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
      const elapsed = (new Date().getTime() - turnStart) / 1000;
      if (elapsed < 28) return res.status(400).json({ message: 'Not timed out yet' });

      const nextTurn = player === 'p1' ? 'p2' : 'p1';
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';

      await storage.createLog({ gameId: id, message: `SYSTEM: ${playerLabel} CONNECTION TIMED OUT. TURN SKIPPED.`, type: 'error' });

      const updates: any = { turn: nextTurn, isFirewallActive: false };
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

      if (game.mode === 'custom') {
          // --- التحديث هنا: قدرة الـ DDOS تعتمد على الـ Firewall أيضاً ---
          if ((type === 'firewall' || type === 'timeHack') && !game.allowFirewall) return res.status(400).json({ message: 'Disabled' });
          if (type === 'virus' && !game.allowVirus) return res.status(400).json({ message: 'Disabled' });
          if (type === 'bruteforce' && !game.allowBruteforce) return res.status(400).json({ message: 'Disabled' });
          if (type === 'changeDigit' && !game.allowChangeDigit) return res.status(400).json({ message: 'Disabled' });
          if (type === 'swapDigits' && !game.allowSwapDigits) return res.status(400).json({ message: 'Disabled' });
          if (type === 'emp' && !game.allowEmp) return res.status(400).json({ message: 'Disabled' });
          if (type === 'spyware' && !game.allowSpyware) return res.status(400).json({ message: 'Disabled' });
          if (type === 'honeypot' && !game.allowHoneypot) return res.status(400).json({ message: 'Disabled' });
      }

      const updates: any = {}; let logMessage = "";
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]';
      const myCode = player === 'p1' ? game.p1Code : game.p2Code;
      const targetCode = player === 'p1' ? game.p2Code : game.p1Code;

      if (type === 'firewall') {
        if ((player === 'p1' && game.p1FirewallUsed) || (player === 'p2' && game.p2FirewallUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1FirewallUsed' : 'p2FirewallUsed'] = true; updates.isFirewallActive = true; 
        logMessage = `${playerLabel} ACTIVATED FIREWALL. TURN EXTENDED.`;
      } 
      else if (type === 'timeHack') {
        if (game.mode !== 'blitz' && game.mode !== 'custom') return res.status(400).json({ message: 'Only available in Blitz or Custom mode' });
        if ((player === 'p1' && game.p1TimeHackUsed) || (player === 'p2' && game.p2TimeHackUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1TimeHackUsed' : 'p2TimeHackUsed'] = true; updates.isTimeHackActive = true; 
        logMessage = `WARNING: ${playerLabel} LAUNCHED DDOS ATTACK! OPPONENT'S NEXT TURN REDUCED BY 20s.`;
      }
      else if (type === 'virus') {
        if ((player === 'p1' && game.p1VirusUsed) || (player === 'p2' && game.p2VirusUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1VirusUsed' : 'p2VirusUsed'] = true;
        
        const opponentLabel = player === 'p1' ? '[P2]' : '[P1]';
        await storage.deletePlayerLogs(id, opponentLabel);
        
        logMessage = `WARNING: ${playerLabel} UPLOADED A VIRUS! ALL ${opponentLabel} SYSTEM LOGS DELETED.`;
      }
      else if (type === 'bruteforce') {
        if ((player === 'p1' && game.p1BruteforceUsed) || (player === 'p2' && game.p2BruteforceUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1BruteforceUsed' : 'p2BruteforceUsed'] = true;
        logMessage = `${playerLabel} USED BRUTEFORCE. 1ST DIGIT IS [ ${targetCode![0]} ]`;
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
      // --- NEW: STEALTH AND INTEL POWERUPS ---
      else if (type === 'emp') {
        if ((player === 'p1' && game.p1EmpUsed) || (player === 'p2' && game.p2EmpUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1EmpUsed' : 'p2EmpUsed'] = true;
        updates[player === 'p1' ? 'p2Jammed' : 'p1Jammed'] = true;
        logMessage = ""; // لا يُظهر أي رسالة في السجل نهائياً!
      }
      else if (type === 'honeypot') {
        if ((player === 'p1' && game.p1HoneypotUsed) || (player === 'p2' && game.p2HoneypotUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1HoneypotUsed' : 'p2HoneypotUsed'] = true;
        updates[player === 'p1' ? 'p2Honeypoted' : 'p1Honeypoted'] = true;
        logMessage = ""; // لا يُظهر أي رسالة في السجل نهائياً!
      }
      else if (type === 'spyware') {
        if ((player === 'p1' && game.p1SpywareUsed) || (player === 'p2' && game.p2SpywareUsed)) return res.status(400).json({ message: 'Used' });
        updates[player === 'p1' ? 'p1SpywareUsed' : 'p2SpywareUsed'] = true;
        const codeSum = targetCode!.split('').reduce((acc, curr) => acc + parseInt(curr), 0);
        logMessage = `SYSTEM: ${playerLabel} DEPLOYED SPYWARE. TARGET CODE SUM = ${codeSum}`;
      }

      updates.turnStartedAt = new Date(); 
      await storage.updateGame(id, updates);
      if (logMessage !== "") await storage.createLog({ gameId: id, message: logMessage, type: 'warning' });
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
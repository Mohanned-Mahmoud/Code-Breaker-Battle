import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { GameStateResponse } from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

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
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.join('');
  }

  // ==========================================
  // 1V1 MODE ROUTES
  // ==========================================
  app.post(api.games.create.path, async (req, res) => { const game = await storage.createGame(req.body?.mode || 'normal', req.body?.customSettings); res.status(201).json({ id: game.id }); });
  
  app.get(api.games.get.path, async (req, res) => { 
    const id = Number(req.params.id); const game = await storage.getGame(id); if (!game) return res.status(404).json({ message: 'Game not found' }); 
    const guesses = await storage.getGuesses(id); let timeLeft = 0; const isTimed = game.mode === 'blitz' || (game.mode === 'custom' && game.customTimer); 
    if (isTimed && game.status === 'playing') { const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime(); const elapsed = Math.floor((new Date().getTime() - turnStart) / 1000); timeLeft = Math.max(0, 30 - elapsed); } 
    const response: GameStateResponse = { ...game, status: game.status as any, turn: game.turn as any, winner: game.winner as any, p1TimeHackUsed: game.p1TimeHackUsed ?? false, p2TimeHackUsed: game.p2TimeHackUsed ?? false, guesses, timeLeft }; res.json(response); 
  });
  
  app.get('/api/games/:id/code/:player', async (req, res) => { const game = await storage.getGame(Number(req.params.id)); if (!game) return res.status(404).json({ message: 'Not found' }); res.json({ code: req.params.player === 'p1' ? game.p1Code : game.p2Code }); });
  
  app.post(api.games.setup.path, async (req, res) => { try { const id = Number(req.params.id); const { player, code } = api.games.setup.input.parse(req.body); const game = await storage.getGame(id); if (!game) return res.status(404).json({ message: 'Not found' }); const updates: any = {}; if (player === 'p1') { updates.p1Code = code; updates.p1Setup = true; } else { updates.p2Code = code; updates.p2Setup = true; } const isP1Ready = player === 'p1' ? true : game.p1Setup; const isP2Ready = player === 'p2' ? true : game.p2Setup; if (isP1Ready && isP2Ready) { updates.status = 'playing'; updates.turn = 'p1'; updates.turnStartedAt = new Date(); } await storage.updateGame(id, updates); res.json({ success: true }); } catch (err) { res.status(400).json({ message: 'Invalid input' }); } });
  
  // ==========================================
  // UPDATED GUESS ROUTE (WITH RANDOM GLITCHES)
  // ==========================================
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
      
      let displayHits = hits; let displayBlips = blips; 
      let isJammed = player === 'p1' ? game.p1Jammed : game.p2Jammed; 
      let isHoneypoted = player === 'p1' ? game.p1Honeypoted : game.p2Honeypoted; 
      
      if (hits !== 4) { 
        if (isJammed) { 
          displayHits = -1; displayBlips = -1; updates[player === 'p1' ? 'p1Jammed' : 'p2Jammed'] = false; 
        } else if (isHoneypoted) { 
          displayHits = hits > 0 ? 0 : 1; displayBlips = blips > 0 ? 0 : (hits === 0 ? 2 : 1); updates[player === 'p1' ? 'p1Honeypoted' : 'p2Honeypoted'] = false; 
        } 
      } 
      
      await storage.createGuess({ gameId: id, player, guess, hits: displayHits, blips: displayBlips, timestamp: new Date() }); 
      
      let logStr = displayHits === -1 
        ? `${playerLabel} CODE: ${guess} >> HITS: ░░ | CLOSE: ░░ [SIGNAL JAMMED]` 
        : `${playerLabel} CODE: ${guess} >> HITS: ${displayHits} | CLOSE: ${displayBlips}`; 
      
      await storage.createLog({ gameId: id, message: logStr, type: hits === 4 ? 'success' : (isJammed ? 'error' : 'info') }); 
      
      let currentTurnCount = (game.turnCount || 0) + 1; 
      updates.turnCount = currentTurnCount; 
      
      let skipTurnSwitch = false; 

      if (hits === 4) { 
        updates.status = 'finished'; updates.winner = player; 
      } else { 
        
        if (game.mode === 'glitch' && currentTurnCount >= (game.nextGlitchTurn || 3)) { 
          updates.nextGlitchTurn = currentTurnCount + Math.floor(Math.random() * 6) + 3;
          const glitchType = Math.floor(Math.random() * 6); 

          if (glitchType === 0) { 
            updates.p1Code = shuffleString(game.p1Code!); updates.p2Code = shuffleString(game.p2Code!); 
            await storage.createLog({ gameId: id, message: `[GLITCH] SYSTEM REBOOT: ALL MASTER CODES SHUFFLED!`, type: 'error' }); 
            
          } else if (glitchType === 1) { 
            updates.p1FirewallUsed = false; updates.p1TimeHackUsed = false; updates.p1VirusUsed = false; updates.p1BruteforceUsed = false; updates.p1ChangeDigitUsed = false; updates.p1SwapDigitsUsed = false; updates.p1EmpUsed = false; updates.p1SpywareUsed = false; updates.p1HoneypotUsed = false; updates.p1PhishingUsed = false;
            updates.p2FirewallUsed = false; updates.p2TimeHackUsed = false; updates.p2VirusUsed = false; updates.p2BruteforceUsed = false; updates.p2ChangeDigitUsed = false; updates.p2SwapDigitsUsed = false; updates.p2EmpUsed = false; updates.p2SpywareUsed = false; updates.p2HoneypotUsed = false; updates.p2PhishingUsed = false;
            await storage.createLog({ gameId: id, message: `[GLITCH] FIREWALL DOWN: ALL POWERUPS RESTORED!`, type: 'success' }); 
            
          } else if (glitchType === 2) { 
            // Bad: Mutate First Digit
            const r1 = Math.floor(Math.random() * 10).toString(); const r2 = Math.floor(Math.random() * 10).toString(); 
            updates.p1Code = r1 + game.p1Code!.substring(1); updates.p2Code = r2 + game.p2Code!.substring(1); 
            await storage.createLog({ gameId: id, message: `[GLITCH] DATA CORRUPTION: 1ST DIGIT MUTATED FOR BOTH PLAYERS!`, type: 'error' }); 
            
          } else if (glitchType === 3) {
            // Good: Extra Turn (System Overclock)
            skipTurnSwitch = true;
            await storage.createLog({ gameId: id, message: `[GLITCH] SYSTEM OVERCLOCK: ${playerLabel} IS GRANTED A FREE EXTRA TURN!`, type: 'success' });
            
          } else if (glitchType === 4) {
            // Good: Reveal the Sums of the Codes (Data Leak)
            const p1Sum = game.p1Code!.split('').reduce((acc, curr) => acc + parseInt(curr), 0);
            const p2Sum = game.p2Code!.split('').reduce((acc, curr) => acc + parseInt(curr), 0);
            await storage.createLog({ gameId: id, message: `[GLITCH] DATA LEAK: P1 CODE SUM = ${p1Sum} | P2 CODE SUM = ${p2Sum}`, type: 'success' });

          } else if (glitchType === 5) {
            // Good: Reveal exactly 1 random digit for both players
            const randomPos = Math.floor(Math.random() * 4);
            const p1Digit = game.p1Code![randomPos];
            const p2Digit = game.p2Code![randomPos];
            await storage.createLog({ gameId: id, message: `[GLITCH] AUTO-DECRYPT: POSITION ${randomPos + 1} IS [${p1Digit}] FOR P1 AND [${p2Digit}] FOR P2!`, type: 'success' });
          }
        }

        // Handle Turn Switching properly based on powerups and our new Overclock glitch
        if (skipTurnSwitch) {
            updates.turnStartedAt = new Date(); 
        } else if (game.isFirewallActive) { 
            updates.isFirewallActive = false; updates.turnStartedAt = new Date(); 
            await storage.createLog({ gameId: id, message: `SYSTEM: FIREWALL EXTENDED ${playerLabel} TURN.`, type: 'warning' }); 
        } else { 
            updates.turn = player === 'p1' ? 'p2' : 'p1'; 
            if (game.isTimeHackActive) { 
                updates.turnStartedAt = new Date(Date.now() - 20000); updates.isTimeHackActive = false; 
            } else { 
                updates.turnStartedAt = new Date(); 
            } 
        } 
      } 
      
      await storage.updateGame(id, updates); 
      res.json({ hits, blips }); 
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); } 
  });
  
  app.post(api.games.timeout.path, async (req, res) => { try { const id = Number(req.params.id); const { player } = req.body; const game = await storage.getGame(id); const isTimed = game?.mode === 'blitz' || (game?.mode === 'custom' && game?.customTimer); if (!game || game.status !== 'playing' || game.turn !== player || !isTimed) return res.status(400).json({ message: 'Invalid' }); const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime(); const elapsed = (new Date().getTime() - turnStart) / 1000; if (elapsed < 28) return res.status(400).json({ message: 'Not timed out yet' }); const nextTurn = player === 'p1' ? 'p2' : 'p1'; const playerLabel = player === 'p1' ? '[P1]' : '[P2]'; await storage.createLog({ gameId: id, message: `SYSTEM: ${playerLabel} CONNECTION TIMED OUT. TURN SKIPPED.`, type: 'error' }); const updates: any = { turn: nextTurn, isFirewallActive: false }; if (game.isTimeHackActive) { updates.turnStartedAt = new Date(Date.now() - 20000); updates.isTimeHackActive = false; } else { updates.turnStartedAt = new Date(); } await storage.updateGame(id, updates); res.json({ success: true }); } catch (err) { res.status(400).json({ message: 'Error' }); } });
  
  app.get(api.games.logs.path, async (req, res) => { res.json(await storage.getLogs(Number(req.params.id))); });
  app.get('/api/games/:id/master-logs', async (req, res) => { res.json(await storage.getAllLogs(Number(req.params.id))); });

  app.post(api.games.powerup.path, async (req, res) => { 
    try { 
      const id = Number(req.params.id); const { player, type, targetIndex, newDigit, swapIndex1, swapIndex2 } = req.body; const game = await storage.getGame(id); if (!game || game.status !== 'playing' || game.turn !== player) return res.status(400).json({ message: 'Invalid' }); const updates: any = {}; let logMessage = ""; const playerLabel = player === 'p1' ? '[P1]' : '[P2]'; const myCode = player === 'p1' ? game.p1Code : game.p2Code; const targetCode = player === 'p1' ? game.p2Code : game.p1Code; 
      
      if (type === 'firewall') { updates[player === 'p1' ? 'p1FirewallUsed' : 'p2FirewallUsed'] = true; updates.isFirewallActive = true; logMessage = `${playerLabel} ACTIVATED FIREWALL. TURN EXTENDED.`; } 
      else if (type === 'timeHack') { updates[player === 'p1' ? 'p1TimeHackUsed' : 'p2TimeHackUsed'] = true; updates.isTimeHackActive = true; logMessage = `WARNING: ${playerLabel} LAUNCHED DDOS ATTACK! OPPONENT'S NEXT TURN REDUCED BY 20s.`; } 
      else if (type === 'virus') { updates[player === 'p1' ? 'p1VirusUsed' : 'p2VirusUsed'] = true; const opponentLabel = player === 'p1' ? '[P2]' : '[P1]'; await storage.deletePlayerLogs(id, opponentLabel); logMessage = `WARNING: ${playerLabel} UPLOADED A VIRUS! ALL ${opponentLabel} SYSTEM LOGS DELETED.`; } 
      else if (type === 'bruteforce') { updates[player === 'p1' ? 'p1BruteforceUsed' : 'p2BruteforceUsed'] = true; logMessage = `${playerLabel} USED BRUTEFORCE. 1ST DIGIT IS [ ${targetCode![0]} ]`; } 
      else if (type === 'changeDigit') { let codeArr = myCode!.split(''); codeArr[targetIndex] = newDigit.toString(); updates[player === 'p1' ? 'p1Code' : 'p2Code'] = codeArr.join(''); updates[player === 'p1' ? 'p1ChangeDigitUsed' : 'p2ChangeDigitUsed'] = true; logMessage = `SYSTEM: ${playerLabel} MUTATED THEIR MASTER CODE.`; } 
      else if (type === 'swapDigits') { let codeArr = myCode!.split(''); let temp = codeArr[swapIndex1]; codeArr[swapIndex1] = codeArr[swapIndex2]; codeArr[swapIndex2] = temp; updates[player === 'p1' ? 'p1Code' : 'p2Code'] = codeArr.join(''); updates[player === 'p1' ? 'p1SwapDigitsUsed' : 'p2SwapDigitsUsed'] = true; logMessage = `SYSTEM: ${playerLabel} SHUFFLED THEIR MASTER CODE.`; } 
      else if (type === 'emp') { updates[player === 'p1' ? 'p1EmpUsed' : 'p2EmpUsed'] = true; updates[player === 'p1' ? 'p2Jammed' : 'p1Jammed'] = true; } 
      else if (type === 'honeypot') { updates[player === 'p1' ? 'p1HoneypotUsed' : 'p2HoneypotUsed'] = true; updates[player === 'p1' ? 'p2Honeypoted' : 'p1Honeypoted'] = true; } 
      else if (type === 'spyware') { updates[player === 'p1' ? 'p1SpywareUsed' : 'p2SpywareUsed'] = true; const codeSum = targetCode!.split('').reduce((acc, curr) => acc + parseInt(curr), 0); logMessage = `SYSTEM: ${playerLabel} DEPLOYED SPYWARE. TARGET CODE SUM = ${codeSum}`; } 
      
      // --- PERFECTLY SYNCED PHISHING ATTACK LOGIC (1v1) ---
      else if (type === 'phishing') {
          const playerUsedProp = player === 'p1' ? 'p1PhishingUsed' : 'p2PhishingUsed';
          if ((game as any)[playerUsedProp]) return res.status(400).json({ message: 'Phishing already used' });

          const oppPrefix = player === 'p1' ? 'p2' : 'p1';
          const myPrefix = player === 'p1' ? 'p1' : 'p2';
          
          const isCustom = game.mode === 'custom';
          const isGlitch = game.mode === 'glitch';
          const isBlitz = game.mode === 'blitz';
          const isTimed = isBlitz || (isCustom && game.customTimer);

          // This perfectly matches the frontend UI rules! If they don't see it, we can't steal it!
          const showFirewallOrDdos = isCustom ? game.allowFirewall : true; 
          const showVirus = isCustom ? game.allowVirus : isGlitch; 
          const showBruteforce = isCustom ? game.allowBruteforce : true;
          const showChangeDigit = isCustom ? game.allowChangeDigit : true;
          const showSwapDigits = isCustom ? game.allowSwapDigits : true;
          const showEmp = isCustom ? game.allowEmp : isGlitch;
          const showSpyware = isCustom ? game.allowSpyware : isGlitch;
          const showHoneypot = isCustom ? game.allowHoneypot : isGlitch;

          const availablePowerups = [
              { id: 'Firewall', name: 'FIREWALL', enabled: !isTimed && showFirewallOrDdos },
              { id: 'TimeHack', name: 'DDOS ATTACK', enabled: isTimed && showFirewallOrDdos },
              { id: 'Virus', name: 'VIRUS', enabled: showVirus },
              { id: 'Bruteforce', name: 'BRUTEFORCE', enabled: showBruteforce },
              { id: 'ChangeDigit', name: 'CHANGE DIGIT', enabled: showChangeDigit },
              { id: 'SwapDigits', name: 'SWAP DIGITS', enabled: showSwapDigits },
              { id: 'Emp', name: 'EMP JAMMER', enabled: showEmp },
              { id: 'Spyware', name: 'SPYWARE', enabled: showSpyware },
              { id: 'Honeypot', name: 'HONEYPOT', enabled: showHoneypot }
          ];

          // Filter out disabled ones, AND ones the enemy has already used
          const availableToSteal = availablePowerups.filter(p => p.enabled && !(game as any)[`${oppPrefix}${p.id}Used`]);

          updates[playerUsedProp] = true;

          if (availableToSteal.length === 0) {
              logMessage = `🎣 SYSTEM: ${playerLabel} LAUNCHED PHISHING ATTACK, BUT ENEMY ARSENAL IS EMPTY!`;
          } else {
              const stolen = availableToSteal[Math.floor(Math.random() * availableToSteal.length)];
              updates[`${oppPrefix}${stolen.id}Used`] = true; // Disable for enemy
              updates[`${myPrefix}${stolen.id}Used`] = false; // Give to attacker
              logMessage = `🎣 SYSTEM: ${playerLabel} DEPLOYED PHISHING LINK AND STOLE [${stolen.name}]!`;
          }
      }

      updates.turnStartedAt = new Date(); await storage.updateGame(id, updates); if (logMessage !== "") await storage.createLog({ gameId: id, message: logMessage, type: 'warning' }); res.json(await storage.getGame(id)); 
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); } 
  });
  
  app.post('/api/games/:id/restart', async (req, res) => { const id = Number(req.params.id); await storage.resetGame(id); await storage.createLog({ gameId: id, message: "SYSTEM: RESTART SEQUENCE INITIATED.", type: "warning" }); res.json({ success: true }); });

  // ==========================================
  // PARTY MODE ROUTES
  // ==========================================

  app.post('/api/party/create', async (req, res) => {
    const { subMode, maxPlayers, customSettings, winCondition, targetPoints } = req.body;
    const actualWinCond = subMode === 'battle_royale' ? 'elimination' : (winCondition || 'points');
    const game = await storage.createPartyGame(subMode, maxPlayers, customSettings, actualWinCond, targetPoints || 15);
    await storage.updatePartyGame(game.id, { winCondition: actualWinCond, targetPoints: targetPoints || 15 });
    res.status(201).json({ id: game.id, roomId: game.roomId });
  });

  app.post('/api/party/join', async (req, res) => {
    const { roomId, playerName, playerColor } = req.body; 
    
    const game = await storage.getPartyGameByRoomId(roomId);
    if (!game) return res.status(404).json({ message: 'Room not found' });
    if (game.status !== 'playing' && game.status !== 'waiting') return res.status(400).json({ message: 'Game already finished' });
    if (game.status === 'playing') return res.status(400).json({ message: 'Game already started' });
    
    const players = await storage.getPartyPlayers(game.id);
    if (players.length >= game.maxPlayers) return res.status(400).json({ message: 'Room is full' });
    if (players.some(p => p.playerName === playerName)) return res.status(400).json({ message: 'Name already taken' });
    if (players.some(p => p.playerColor === playerColor)) return res.status(400).json({ message: 'Color already taken by another hacker' });    
    
    // Moved inside the scope of the app.post block so `player` is available for res.json
    const player = await storage.addPartyPlayer(game.id, playerName, playerColor);
    res.json({ gameId: game.id, playerId: player.id });
  });

  app.get('/api/party/:id', async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getPartyGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const players = await storage.getPartyPlayers(id);
    const guesses = await storage.getPartyGuesses(id);
    const logs = await storage.getPartyLogs(id);
    
    let timeLeft = 0;
    if (game.customTimer && game.status === 'playing') {
        const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
        const elapsed = Math.floor((new Date().getTime() - turnStart) / 1000);
        timeLeft = Math.max(0, 30 - elapsed);
    }
    res.json({ ...game, players, guesses, logs, timeLeft });
  });

  app.get('/api/party/:id/master-logs', async (req, res) => { res.json(await storage.getAllPartyLogs(Number(req.params.id))); });

  app.post('/api/party/:id/start', async (req, res) => {
    try {
      const id = Number(req.params.id); const { playerId } = req.body;
      const game = await storage.getPartyGame(id);
      if (!game || game.status !== 'waiting') return res.status(400).json({ message: 'Invalid state' });

      const players = await storage.getPartyPlayers(id);
      if (players.length === 0 || players[0].id !== playerId) return res.status(403).json({ message: 'Only host can start' });
      
      // التعديل: إجبار اكتمال الروم
      if (players.length !== game.maxPlayers) return res.status(400).json({ message: 'Room must be full to start' });
      if (!players.every(p => p.isSetup)) return res.status(400).json({ message: 'Not everyone is ready' });

      const turnOrder = players.map(p => p.id);
      await storage.updatePartyGame(id, {
         status: 'playing', activePlayerId: turnOrder[0], turnOrder: JSON.stringify(turnOrder), turnStartedAt: new Date()
      });
      await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: SQUAD PROTOCOL INITIATED. HACKING COMMENCED.`, type: 'warning' });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error starting game' }); }
  });

  app.post('/api/party/:id/setup', async (req, res) => {
    try {
      const id = Number(req.params.id); const { playerId, code } = req.body;
      await storage.updatePartyPlayer(playerId, { code, isSetup: true });
      
      const game = await storage.getPartyGame(id);
      if (game && game.status === 'playing') {
          const p = await storage.getPartyPlayer(playerId);
          await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${p?.playerName} HAS REBOOTED THEIR KEY AND IS BACK ONLINE.`, type: 'info' });
      }
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error in setup' }); }
  });

  app.post('/api/party/:id/restart', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.restartPartyGame(id);
      await storage.createPartyLog({ partyGameId: id, message: "SYSTEM: SQUAD ROOM REBOOTED. PLEASE RE-ENTER CODES.", type: "warning" });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error restarting game' }); }
  });

  app.post('/api/party/:id/timeout', async (req, res) => {
    try {
      const id = Number(req.params.id); const { playerId } = req.body;
      const game = await storage.getPartyGame(id);
      if (!game || game.status !== 'playing' || game.activePlayerId !== playerId || !game.customTimer) return res.status(400).json({ message: 'Invalid' });

      const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
      const elapsed = (new Date().getTime() - turnStart) / 1000;
      if (elapsed < 28) return res.status(400).json({ message: 'Not timed out yet' });

      const attacker = await storage.getPartyPlayer(playerId);
      await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${attacker?.playerName || 'HACKER'} TIMED OUT. TURN SKIPPED.`, type: 'error' });

      const players = await storage.getPartyPlayers(id);
      let turnOrder = JSON.parse(game.turnOrder!);
      let currentIndex = turnOrder.indexOf(playerId);
      let nextIndex = (currentIndex + 1) % turnOrder.length;
      let nextPlayerId = turnOrder[nextIndex];
      
      let loopCount = 0;
      while (loopCount < turnOrder.length) {
          const nextPlayer = players.find(p => p.id === nextPlayerId);
          if (nextPlayer && !nextPlayer.isEliminated && nextPlayer.isSetup) break;
          nextIndex = (nextIndex + 1) % turnOrder.length;
          nextPlayerId = turnOrder[nextIndex]; loopCount++;
      }

      await storage.updatePartyGame(id, { activePlayerId: nextPlayerId, turnCount: (game.turnCount || 0) + 1, turnStartedAt: new Date() });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error' }); }
  });

  app.post('/api/party/:id/skip', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { playerId } = req.body;
      const game = await storage.getPartyGame(id);
      
      if (!game || game.status !== 'playing' || game.activePlayerId !== playerId) {
          return res.status(400).json({ message: 'Invalid turn' });
      }

      const attacker = await storage.getPartyPlayer(playerId);
      await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${attacker?.playerName} OFFLINE. TURN MANUALLY SKIPPED.`, type: 'warning' });

      const players = await storage.getPartyPlayers(id);
      let turnOrder = JSON.parse(game.turnOrder!);
      let currentIndex = turnOrder.indexOf(playerId);
      let nextIndex = (currentIndex + 1) % turnOrder.length;
      let nextPlayerId = turnOrder[nextIndex];

      let loopCount = 0;
      while (loopCount < turnOrder.length) {
          const nextPlayer = players.find(p => p.id === nextPlayerId);
          if (nextPlayer && !nextPlayer.isEliminated && nextPlayer.isSetup) break;
          nextIndex = (nextIndex + 1) % turnOrder.length;
          nextPlayerId = turnOrder[nextIndex]; loopCount++;
      }

      await storage.updatePartyGame(id, {
          activePlayerId: nextPlayerId,
          turnCount: (game.turnCount || 0) + 1,
          turnStartedAt: new Date()
      });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error skipping turn' }); }
  });

  app.post('/api/party/:id/powerup', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { attackerId, targetId, type, targetIndex, newDigit, swapIndex1, swapIndex2 } = req.body;
      const game = await storage.getPartyGame(id);
      if (!game || game.status !== 'playing') return res.status(400).json({ message: 'Game not active' });

      const attacker = await storage.getPartyPlayer(attackerId);
      if (!attacker) return res.status(400).json({ message: 'Invalid attacker' });
      
      const isGhost = attacker.isGhost && attacker.isEliminated;
      if (game.activePlayerId !== attackerId && !isGhost) return res.status(400).json({ message: 'Not your turn' });

      const target = targetId ? await storage.getPartyPlayer(targetId) : null;
      let logMessage = ""; let updates: any = {}; let gameUpdates: any = {};

      if (type === 'firewall') {
          if (attacker.firewallUsed) return res.status(400).json({ message: 'Firewall already used' });
          updates.firewallUsed = true; updates.isFirewallActive = true;
          logMessage = `${attacker.playerName} ACTIVATED FIREWALL. NEXT TURN BLOCKED.`;
      } else if (type === 'timeHack') {
          if (attacker.timeHackUsed) return res.status(400).json({ message: 'DDoS already used' });
          updates.timeHackUsed = true; gameUpdates.turnStartedAt = new Date(Date.now() - 20000);
          logMessage = `WARNING: ${attacker.playerName} LAUNCHED DDOS ATTACK! TIME REDUCED BY 20s.`;
      } else if (type === 'virus') {
          if (attacker.virusUsed) return res.status(400).json({ message: 'Virus already used' });
          updates.virusUsed = true; await storage.clearPartyLogs(id);
          logMessage = `WARNING: ${attacker.playerName} UPLOADED A VIRUS! SYSTEM LOGS DELETED!`;
      } else if (type === 'bruteforce') {
          if (attacker.bruteforceUsed) return res.status(400).json({ message: 'Bruteforce already used' });
          if (!target || !target.isSetup) return res.status(400).json({ message: 'Valid target required' });
          updates.bruteforceUsed = true;
          logMessage = `${attacker.playerName} USED BRUTEFORCE ON ${target.playerName}. 1ST DIGIT IS [ ${target.code![0]} ]`;
      } else if (type === 'changeDigit') {
          if (attacker.changeDigitUsed) return res.status(400).json({ message: 'Change Digit already used' });
          let codeArr = (attacker.code || "0000").split(''); codeArr[targetIndex] = newDigit.toString();
          updates.code = codeArr.join(''); updates.changeDigitUsed = true;
          logMessage = `SYSTEM: ${attacker.playerName} MUTATED THEIR MASTER CODE.`;
      } else if (type === 'swapDigits') {
          if (attacker.swapDigitsUsed) return res.status(400).json({ message: 'Swap Digits already used' });
          let codeArr = (attacker.code || "0000").split(''); let temp = codeArr[swapIndex1]; codeArr[swapIndex1] = codeArr[swapIndex2]; codeArr[swapIndex2] = temp;
          updates.code = codeArr.join(''); updates.swapDigitsUsed = true;
          logMessage = `SYSTEM: ${attacker.playerName} SHUFFLED THEIR MASTER CODE.`;
      } else if (type === 'emp') {
          if (attacker.empUsed) return res.status(400).json({ message: 'EMP already used' });
          if (!target) return res.status(400).json({ message: 'Target required' });
          updates.empUsed = true; await storage.updatePartyPlayer(targetId, { isJammed: true });
      } else if (type === 'honeypot') {
          if (attacker.honeypotUsed) return res.status(400).json({ message: 'Honeypot already used' });
          updates.honeypotUsed = true; updates.isHoneypoted = true;
      } else if (type === 'spyware') {
          if (attacker.spywareUsed) return res.status(400).json({ message: 'Spyware already used' });
          if (!target || !target.isSetup) return res.status(400).json({ message: 'Valid target required' });
          updates.spywareUsed = true;
          const codeSum = target.code!.split('').reduce((acc, curr) => acc + parseInt(curr), 0);
          logMessage = `SYSTEM: ${attacker.playerName} DEPLOYED SPYWARE ON ${target.playerName}. CODE SUM = ${codeSum}`;
      } 
      // --- PERFECTLY SYNCED PHISHING ATTACK LOGIC (Party Mode) ---
      else if (type === 'phishing') {
          if (attacker.phishingUsed) return res.status(400).json({ message: 'Phishing already used' });
          if (!target || !target.isSetup) return res.status(400).json({ message: 'Valid target required' });
          
          updates.phishingUsed = true;
          
          const showFirewall = game.allowFirewall ?? true;
          const showVirus = game.allowVirus ?? true;
          const showBruteforce = game.allowBruteforce ?? true;
          const showChangeDigit = game.allowChangeDigit ?? true;
          const showSwapDigits = game.allowSwapDigits ?? true;
          const showEmp = game.allowEmp ?? false;
          const showSpyware = game.allowSpyware ?? false;
          const showHoneypot = game.allowHoneypot ?? false;
          const showTimer = game.customTimer ?? false;

          const availablePowerups = [
              { id: 'firewall', name: 'FIREWALL', enabled: showFirewall },
              { id: 'timeHack', name: 'DDOS ATTACK', enabled: showTimer },
              { id: 'virus', name: 'VIRUS', enabled: showVirus },
              { id: 'bruteforce', name: 'BRUTEFORCE', enabled: showBruteforce },
              { id: 'changeDigit', name: 'CHANGE DIGIT', enabled: showChangeDigit },
              { id: 'swapDigits', name: 'SWAP DIGITS', enabled: showSwapDigits },
              { id: 'emp', name: 'EMP JAMMER', enabled: showEmp },
              { id: 'spyware', name: 'SPYWARE', enabled: showSpyware },
              { id: 'honeypot', name: 'HONEYPOT', enabled: showHoneypot }
          ];

          const availableToSteal = availablePowerups.filter(p => p.enabled && !(target as any)[`${p.id}Used`]);

          if (availableToSteal.length === 0) {
              logMessage = `🎣 SYSTEM: ${attacker.playerName} LAUNCHED PHISHING ATTACK ON ${target.playerName}, BUT THEIR ARSENAL IS EMPTY!`;
          } else {
              const stolen = availableToSteal[Math.floor(Math.random() * availableToSteal.length)];
              
              await storage.updatePartyPlayer(targetId, { [`${stolen.id}Used`]: true }); 
              updates[`${stolen.id}Used`] = false; 
              
              logMessage = `🎣 SYSTEM: ${attacker.playerName} DEPLOYED PHISHING LINK ON ${target.playerName} AND STOLE [${stolen.name}]!`;
          }
      }

      if (isGhost) {
          const currentStrikes = attacker.successfulDefenses || 0; 
          const newStrikes = currentStrikes + 1;
          updates.successfulDefenses = newStrikes;

          if (newStrikes >= 2) {
              updates.firewallUsed = true; updates.timeHackUsed = true; updates.virusUsed = true;
              updates.bruteforceUsed = true; updates.changeDigitUsed = true; updates.swapDigitsUsed = true;
              updates.empUsed = true; updates.spywareUsed = true; updates.honeypotUsed = true; updates.phishingUsed = true;
              logMessage = `👻 [GHOST SABOTAGE - FINAL STRIKE] ` + logMessage;
          } else {
              logMessage = `👻 [GHOST SABOTAGE - STRIKE 1/2] ` + logMessage;
          }
      }

      await storage.updatePartyPlayer(attackerId, updates);
      if (Object.keys(gameUpdates).length > 0) await storage.updatePartyGame(id, gameUpdates);
      if (logMessage) await storage.createPartyLog({ partyGameId: id, message: logMessage, type: 'warning' });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error in powerup' }); }
  });

  app.post('/api/party/:id/guess', async (req, res) => {
    try {
       const id = Number(req.params.id);
       const { attackerId, targetId, guess } = req.body;
       const game = await storage.getPartyGame(id);
       if (!game || game.status !== 'playing' || game.activePlayerId !== attackerId) return res.status(400).json({ message: 'Invalid turn' });

       const attacker = await storage.getPartyPlayer(attackerId);
       const target = await storage.getPartyPlayer(targetId);
       if (!attacker || !target || (target.isEliminated && game.subMode !== 'battle_royale') || !target.isSetup) return res.status(400).json({ message: 'Target is rebooting or invalid' });

       let { hits, blips } = calculateFeedback(target.code!, guess);
       let displayHits = hits; let displayBlips = blips;

       if (hits !== 4) {
           if (attacker.isJammed) {
               displayHits = -1; displayBlips = -1; await storage.updatePartyPlayer(attackerId, { isJammed: false });
           } else if (target.isHoneypoted) {
               displayHits = hits > 0 ? 0 : 1; displayBlips = blips > 0 ? 0 : (hits === 0 ? 2 : 1);
               await storage.updatePartyPlayer(targetId, { isHoneypoted: false });
           }
       }

       await storage.createPartyGuess({ partyGameId: id, attackerId, targetId, guess, hits: displayHits, blips: displayBlips });
       
       let logStr = displayHits === -1 
         ? `[${attacker.playerName}] guessed [${guess}] on [${target.playerName}] >> HITS: ░░ | CLOSE: ░░ [SIGNAL JAMMED]` 
         : `[${attacker.playerName}] guessed [${guess}] on [${target.playerName}] >> HITS: ${displayHits} | CLOSE: ${displayBlips}`;
       await storage.createPartyLog({ partyGameId: id, message: logStr, type: hits === 4 ? 'success' : 'info' });

       let updates: any = {};
       const isPointsMode = game.winCondition === 'points' && game.subMode !== 'battle_royale';
       let currentAttackerPoints = attacker.points || 0; 
       
       let isTargetCrashed = false; 

       if (hits === 4) {
           if (isPointsMode) {
               currentAttackerPoints += 3;
               await storage.updatePartyPlayer(attackerId, { points: currentAttackerPoints });
               await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${attacker.playerName} CRACKED ${target.playerName}! (+3 PTS)`, type: 'success' });
               
               await storage.updatePartyPlayer(targetId, { code: "", isSetup: false });
               isTargetCrashed = true; 
               await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${target.playerName}'s system crashed! Awaiting manual reboot...`, type: 'error' });

               if (currentAttackerPoints >= (game.targetPoints || 15)) {
                   updates.status = 'finished'; updates.winnerId = attackerId;
                   await storage.createPartyLog({ partyGameId: id, message: `WINNER: ${attacker.playerName} REACHED ${game.targetPoints || 15} PTS!`, type: 'success' });
               }
           } else {
               await storage.updatePartyPlayer(targetId, { isEliminated: true, isGhost: game.subMode === 'battle_royale', successfulDefenses: 0 });
               await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${target.playerName} HAS BEEN COMPROMISED!`, type: 'error' });
           }
       } else if (hits >= 2 && isPointsMode) {
           currentAttackerPoints += 1;
           await storage.updatePartyPlayer(attackerId, { points: currentAttackerPoints });
           await storage.createPartyLog({ partyGameId: id, message: `[INFO] ${attacker.playerName} gained a Partial Hit (+1 PT).`, type: 'info' });

           if (currentAttackerPoints >= (game.targetPoints || 15)) {
               updates.status = 'finished'; updates.winnerId = attackerId;
               await storage.createPartyLog({ partyGameId: id, message: `WINNER: ${attacker.playerName} REACHED ${game.targetPoints || 15} PTS!`, type: 'success' });
           }
       }

       if (updates.status !== 'finished') {
           const players = await storage.getPartyPlayers(id);
           
           if (isTargetCrashed) {
               const t = players.find(p => p.id === targetId);
               if (t) t.isSetup = false; 
           }

           const alivePlayers = players.filter(p => !p.isEliminated);
           
           if (!isPointsMode && alivePlayers.length <= 1) {
               updates.status = 'finished'; updates.winnerId = alivePlayers[0]?.id;
               await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${alivePlayers[0]?.playerName || 'UNKNOWN'} IS THE LAST HACKER STANDING!`, type: 'success' });
           } else if (!attacker.isFirewallActive) {
               let turnOrder = JSON.parse(game.turnOrder!);
               let currentIndex = turnOrder.indexOf(attackerId);
               let nextIndex = (currentIndex + 1) % turnOrder.length;
               let nextPlayerId = turnOrder[nextIndex];
               
               let loopCount = 0;
               while (loopCount < turnOrder.length) {
                   const nextPlayer = players.find(p => p.id === nextPlayerId);
                   if (nextPlayer && !nextPlayer.isEliminated && nextPlayer.isSetup) {
                       break; 
                   }
                   nextIndex = (nextIndex + 1) % turnOrder.length;
                   nextPlayerId = turnOrder[nextIndex]; 
                   loopCount++;
               }
               updates.activePlayerId = nextPlayerId; updates.turnCount = (game.turnCount || 0) + 1; updates.turnStartedAt = new Date();
           } else {
               await storage.updatePartyPlayer(attackerId, { isFirewallActive: false });
           }
       }

       await storage.updatePartyGame(id, updates);
       res.json({ hits, blips });
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });

  return httpServer;
}
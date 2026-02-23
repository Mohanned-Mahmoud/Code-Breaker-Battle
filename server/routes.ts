import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { GameStateResponse } from "@shared/schema";
import { db } from "./db";
import { teamLogs } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

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
  
  app.post(api.games.setup.path, async (req, res) => { try { const id = Number(req.params.id); const { player, code } = api.games.setup.input.parse(req.body); const game = await storage.getGame(id); if (!game) return res.status(404).json({ message: 'Not found' }); const updates: any = {}; if (player === 'p1') { updates.p1Code = code; updates.p1OriginalCode = code; updates.p1Setup = true; } else { updates.p2Code = code; updates.p2OriginalCode = code; updates.p2Setup = true; } const isP1Ready = player === 'p1' ? true : game.p1Setup; const isP2Ready = player === 'p2' ? true : game.p2Setup; if (isP1Ready && isP2Ready) { updates.status = 'playing'; updates.turn = 'p1'; updates.turnStartedAt = new Date(); } await storage.updateGame(id, updates); res.json({ success: true }); } catch (err) { res.status(400).json({ message: 'Invalid input' }); } });
  
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
      
      // --- LOGIC BOMB DECREMENT (1v1) ---
      const pLabel = player === 'p1' ? 'p1' : 'p2';
      if ((game as any)[`${pLabel}SilencedTurns`] > 0) {
          updates[`${pLabel}SilencedTurns`] = (game as any)[`${pLabel}SilencedTurns`] - 1;
      }

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
            updates.p1FirewallUsed = false; updates.p1TimeHackUsed = false; updates.p1VirusUsed = false; updates.p1BruteforceUsed = false; updates.p1ChangeDigitUsed = false; updates.p1SwapDigitsUsed = false; updates.p1EmpUsed = false; updates.p1SpywareUsed = false; updates.p1HoneypotUsed = false; updates.p1PhishingUsed = false; updates.p1LogicBombUsed = false; updates.p1SilencedTurns = 0; updates.p1RootkitUsed = false;
            updates.p2FirewallUsed = false; updates.p2TimeHackUsed = false; updates.p2VirusUsed = false; updates.p2BruteforceUsed = false; updates.p2ChangeDigitUsed = false; updates.p2SwapDigitsUsed = false; updates.p2EmpUsed = false; updates.p2SpywareUsed = false; updates.p2HoneypotUsed = false; updates.p2PhishingUsed = false; updates.p2LogicBombUsed = false; updates.p2SilencedTurns = 0; updates.p2RootkitUsed = false;
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
  
  app.post(api.games.timeout.path, async (req, res) => { 
    try { 
      const id = Number(req.params.id); const { player } = req.body; const game = await storage.getGame(id); 
      const isTimed = game?.mode === 'blitz' || (game?.mode === 'custom' && game?.customTimer); 
      if (!game || game.status !== 'playing' || game.turn !== player || !isTimed) return res.status(400).json({ message: 'Invalid' }); 
      const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime(); 
      const elapsed = (new Date().getTime() - turnStart) / 1000; 
      if (elapsed < 28) return res.status(400).json({ message: 'Not timed out yet' }); 
      
      const nextTurn = player === 'p1' ? 'p2' : 'p1'; 
      const playerLabel = player === 'p1' ? '[P1]' : '[P2]'; 
      await storage.createLog({ gameId: id, message: `SYSTEM: ${playerLabel} CONNECTION TIMED OUT. TURN SKIPPED.`, type: 'error' }); 
      const updates: any = { turn: nextTurn, isFirewallActive: false }; 

      // --- LOGIC BOMB DECREMENT (1v1 Timeout) ---
      const pLabel = player === 'p1' ? 'p1' : 'p2';
      if ((game as any)[`${pLabel}SilencedTurns`] > 0) {
          updates[`${pLabel}SilencedTurns`] = (game as any)[`${pLabel}SilencedTurns`] - 1;
      }

      if (game.isTimeHackActive) { 
        updates.turnStartedAt = new Date(Date.now() - 20000); updates.isTimeHackActive = false; 
      } else { 
        updates.turnStartedAt = new Date(); 
      } 
      await storage.updateGame(id, updates); 
      res.json({ success: true }); 
    } catch (err) { res.status(400).json({ message: 'Error' }); } 
  });
  
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
      else if (type === 'logicBomb') { 
          updates[player === 'p1' ? 'p1LogicBombUsed' : 'p2LogicBombUsed'] = true; 
          updates[player === 'p1' ? 'p2SilencedTurns' : 'p1SilencedTurns'] = 2; 
          logMessage = `[LOGIC BOMB] ${playerLabel} THREW A LOGIC BOMB! OPPONENT IS SILENCED FOR 2 TURNS!`; 
      }
      
      // --- ROOTKIT LOGIC (1v1) ---
      else if (type === 'rootkit') {
          const targetPrefix = player === 'p1' ? 'p2' : 'p1';
          const myPrefix = player === 'p1' ? 'p1' : 'p2';
          
          updates[`${myPrefix}RootkitUsed`] = true;
          
          const originalCode = player === 'p1' ? game.p2OriginalCode : game.p1OriginalCode;
          updates[`${targetPrefix}Code`] = originalCode;
          
          // First, we must identify which powerups are actually enabled in this specific match
          const isCustom = game.mode === 'custom';
          const isGlitch = game.mode === 'glitch';
          const isBlitz = game.mode === 'blitz';
          const isTimed = isBlitz || (isCustom && String(game.customTimer) === 'true');

          const showFirewallOrDdos = isCustom ? String(game.allowFirewall) !== 'false' : true; 
          const showVirus = isCustom ? String(game.allowVirus) !== 'false' : (isGlitch || game.mode === 'normal'); 
          const showBruteforce = isCustom ? String(game.allowBruteforce) !== 'false' : true;
          const showChangeDigit = isCustom ? String(game.allowChangeDigit) !== 'false' : true;
          const showSwapDigits = isCustom ? String(game.allowSwapDigits) !== 'false' : true;
          const showEmp = isCustom ? String(game.allowEmp) === 'true' : isGlitch;
          const showSpyware = isCustom ? String(game.allowSpyware) === 'true' : isGlitch;
          const showHoneypot = isCustom ? String(game.allowHoneypot) === 'true' : isGlitch;
          const showLogicBomb = isCustom ? String(game.allowLogicBomb) === 'true' : isGlitch;

          const availablePowerups = [
              { id: 'Firewall', name: 'FIREWALL', enabled: !isTimed && showFirewallOrDdos },
              { id: 'TimeHack', name: 'DDOS ATTACK', enabled: isTimed && showFirewallOrDdos },
              { id: 'Virus', name: 'VIRUS', enabled: showVirus },
              { id: 'Bruteforce', name: 'BRUTEFORCE', enabled: showBruteforce },
              { id: 'ChangeDigit', name: 'CHANGE DIGIT', enabled: showChangeDigit },
              { id: 'SwapDigits', name: 'SWAP DIGITS', enabled: showSwapDigits },
              { id: 'Emp', name: 'EMP JAMMER', enabled: showEmp },
              { id: 'Spyware', name: 'SPYWARE', enabled: showSpyware },
              { id: 'Honeypot', name: 'HONEYPOT', enabled: showHoneypot },
              { id: 'LogicBomb', name: 'LOGIC BOMB', enabled: showLogicBomb }
          ];
          
          // Filter to find powerups that are ENABLED in this match AND UNUSED by the attacker
          const myUnused = availablePowerups.filter(p => p.enabled && !(game as any)[`${myPrefix}${p.id}Used`]);
          
          if (myUnused.length >= 2) {
              // Sacrifice 2 random available powerups
              const sacrificed = myUnused.sort(() => 0.5 - Math.random()).slice(0, 2);
              
              sacrificed.forEach(p => {
                  updates[`${myPrefix}${p.id}Used`] = true; // Attacker loses it
                  updates[`${targetPrefix}${p.id}Used`] = false; // Defender gains it
              });
              
              const sacrificedNames = sacrificed.map(p => p.name).join(" and ");
              logMessage = `[ROOTKIT] ${playerLabel} REVERTED ENEMY CODE TO DAY-1! SACRIFICED [ ${sacrificedNames} ] TO OPPONENT. TURN ENDED.`;
          } else {
              // Punish attacker: Restore all enabled enemy powerups (Rootkit is naturally excluded)
              availablePowerups.forEach(p => {
                  if (p.enabled) {
                      updates[`${targetPrefix}${p.id}Used`] = false; 
                  }
              });
              logMessage = `[ROOTKIT] ${playerLabel} EXECUTED ROOTKIT BUT LACKED SACRIFICES! ENEMY SYSTEMS COMPLETELY REBOOTED (ALL POWERUPS RESTORED). TURN ENDED.`;
          }
          
          // Rootkit instantly ends the turn!
          updates.turn = targetPrefix;
          updates.turnCount = (game.turnCount || 0) + 1;
      }

      // --- PERFECTLY SYNCED PHISHING ATTACK LOGIC (1v1) ---
      else if (type === 'phishing') {
          const playerUsedProp = player === 'p1' ? 'p1PhishingUsed' : 'p2PhishingUsed';
          if ((game as any)[playerUsedProp]) return res.status(400).json({ message: 'Phishing already used' });

          const oppPrefix = player === 'p1' ? 'p2' : 'p1';
          const myPrefix = player === 'p1' ? 'p1' : 'p2';
          
          const isCustom = game.mode === 'custom';
          const isGlitch = game.mode === 'glitch';
          const isBlitz = game.mode === 'blitz';
          const isTimed = isBlitz || (isCustom && String(game.customTimer) === 'true');

          const showFirewallOrDdos = isCustom ? String(game.allowFirewall) !== 'false' : true; 
          const showVirus = isCustom ? String(game.allowVirus) !== 'false' : (isGlitch || game.mode === 'normal'); 
          const showBruteforce = isCustom ? String(game.allowBruteforce) !== 'false' : true;
          const showChangeDigit = isCustom ? String(game.allowChangeDigit) !== 'false' : true;
          const showSwapDigits = isCustom ? String(game.allowSwapDigits) !== 'false' : true;
          
          // STRICT BOOLEAN FIX: يمنع تفعيل الخصائص لو مبعوتة كنص "false"
          const showEmp = isCustom ? String(game.allowEmp) === 'true' : isGlitch;
          const showSpyware = isCustom ? String(game.allowSpyware) === 'true' : isGlitch;
          const showHoneypot = isCustom ? String(game.allowHoneypot) === 'true' : isGlitch;
          const showLogicBomb = isCustom ? String(game.allowLogicBomb) === 'true' : isGlitch;

          const availablePowerups = [
              { id: 'Firewall', name: 'FIREWALL', enabled: !isTimed && showFirewallOrDdos },
              { id: 'TimeHack', name: 'DDOS ATTACK', enabled: isTimed && showFirewallOrDdos },
              { id: 'Virus', name: 'VIRUS', enabled: showVirus },
              { id: 'Bruteforce', name: 'BRUTEFORCE', enabled: showBruteforce },
              { id: 'ChangeDigit', name: 'CHANGE DIGIT', enabled: showChangeDigit },
              { id: 'SwapDigits', name: 'SWAP DIGITS', enabled: showSwapDigits },
              { id: 'Emp', name: 'EMP JAMMER', enabled: showEmp },
              { id: 'Spyware', name: 'SPYWARE', enabled: showSpyware },
              { id: 'Honeypot', name: 'HONEYPOT', enabled: showHoneypot },
              { id: 'LogicBomb', name: 'LOGIC BOMB', enabled: showLogicBomb }
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

      // --- LOGIC BOMB DECREMENT (Party Timeout) ---
      if (attacker && attacker.silencedTurns && attacker.silencedTurns > 0) {
          await storage.updatePartyPlayer(playerId, { silencedTurns: attacker.silencedTurns - 1 });
      }

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

      let updates: any = { activePlayerId: nextPlayerId, turnCount: (game.turnCount || 0) + 1, turnStartedAt: new Date() };

      // --- BOUNTY LIFECYCLE (TIMEOUT) ---
      if (game.subMode === 'bounty_contracts') {
          const nextTurnCount = updates.turnCount;
          const alivePlayers = players.filter(p => !p.isEliminated && p.isSetup);
          const currentBountyTarget = game.bountyTargetId;
          const nextBountyTurn = game.nextBountyTurn || 1;

          if (currentBountyTarget) {
              if (nextTurnCount >= nextBountyTurn) {
                  updates.bountyTargetId = null;
                  updates.bountyPoints = null;
                  updates.nextBountyTurn = nextTurnCount + Math.floor(Math.random() * 3) + 3; // 3 to 5 turn cooldown
                  await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY EXPIRED] The target survived! Cooldown initiated.`, type: 'warning' });
              }
          } else if (nextTurnCount >= nextBountyTurn && alivePlayers.length > 1) {
              const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
              updates.bountyTargetId = randomTarget.id;
              updates.bountyPoints = 3;
              updates.nextBountyTurn = nextTurnCount + players.length; // Bounty lasts for X turns (player count)
              await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY ISSUED] ${randomTarget.playerName} IS THE NEW TARGET! (+6 PTS)`, type: 'warning' });
          }
      }

      await storage.updatePartyGame(id, updates);
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

      // --- LOGIC BOMB DECREMENT (Party Skip) ---
      if (attacker && attacker.silencedTurns && attacker.silencedTurns > 0) {
          await storage.updatePartyPlayer(playerId, { silencedTurns: attacker.silencedTurns - 1 });
      }

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

      let updates: any = {
          activePlayerId: nextPlayerId,
          turnCount: (game.turnCount || 0) + 1,
          turnStartedAt: new Date()
      };

      // --- BOUNTY LIFECYCLE (SKIP) ---
      if (game.subMode === 'bounty_contracts') {
          const nextTurnCount = updates.turnCount;
          const alivePlayers = players.filter(p => !p.isEliminated && p.isSetup);
          const currentBountyTarget = game.bountyTargetId;
          const nextBountyTurn = game.nextBountyTurn || 1;

          if (currentBountyTarget) {
              if (nextTurnCount >= nextBountyTurn) {
                  updates.bountyTargetId = null;
                  updates.bountyPoints = null;
                  updates.nextBountyTurn = nextTurnCount + Math.floor(Math.random() * 3) + 3;
                  await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY EXPIRED] The target survived! Cooldown initiated.`, type: 'warning' });
              }
          } else if (nextTurnCount >= nextBountyTurn && alivePlayers.length > 1) {
              const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
              updates.bountyTargetId = randomTarget.id;
              updates.bountyPoints = 3;
              updates.nextBountyTurn = nextTurnCount + players.length;
              await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY ISSUED] ${randomTarget.playerName} IS THE NEW TARGET! (+6 PTS)`, type: 'warning' });
          }
      }

      await storage.updatePartyGame(id, updates);
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
      } else if (type === 'logicBomb') {
          if (attacker.logicBombUsed) return res.status(400).json({ message: 'Logic Bomb already used' });
          if (!target || !target.isSetup) return res.status(400).json({ message: 'Valid target required' });
          updates.logicBombUsed = true;
          await storage.updatePartyPlayer(targetId, { silencedTurns: 2 });
          logMessage = `[LOGIC BOMB] ${attacker.playerName} THREW A LOGIC BOMB! ${target.playerName} IS SILENCED FOR 2 TURNS!`;
      }
      // --- PERFECTLY SYNCED PHISHING ATTACK LOGIC (Party Mode) ---
      else if (type === 'phishing') {
          if (attacker.phishingUsed) return res.status(400).json({ message: 'Phishing already used' });
          if (!target || !target.isSetup) return res.status(400).json({ message: 'Valid target required' });
          
          updates.phishingUsed = true;
          
          const showFirewallOrDdos = String(game.allowFirewall) !== 'false';
          const showVirus = String(game.allowVirus) !== 'false';
          const showBruteforce = String(game.allowBruteforce) !== 'false';
          const showChangeDigit = String(game.allowChangeDigit) !== 'false';
          const showSwapDigits = String(game.allowSwapDigits) !== 'false';
          
          // STRICT BOOLEAN FIX
          const showEmp = String(game.allowEmp) === 'true';
          const showSpyware = String(game.allowSpyware) === 'true';
          const showHoneypot = String(game.allowHoneypot) === 'true';
          const showLogicBomb = String(game.allowLogicBomb) === 'true';
          const showTimer = String(game.customTimer) === 'true';

          const availablePowerups = [
              { id: 'firewall', name: 'FIREWALL', enabled: !showTimer && showFirewallOrDdos },
              { id: 'timeHack', name: 'DDOS ATTACK', enabled: showTimer && showFirewallOrDdos },
              { id: 'virus', name: 'VIRUS', enabled: showVirus },
              { id: 'bruteforce', name: 'BRUTEFORCE', enabled: showBruteforce },
              { id: 'changeDigit', name: 'CHANGE DIGIT', enabled: showChangeDigit },
              { id: 'swapDigits', name: 'SWAP DIGITS', enabled: showSwapDigits },
              { id: 'emp', name: 'EMP JAMMER', enabled: showEmp },
              { id: 'spyware', name: 'SPYWARE', enabled: showSpyware },
              { id: 'honeypot', name: 'HONEYPOT', enabled: showHoneypot },
              { id: 'logicBomb', name: 'LOGIC BOMB', enabled: showLogicBomb }
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
              updates.empUsed = true; updates.spywareUsed = true; updates.honeypotUsed = true; updates.phishingUsed = true; updates.logicBombUsed = true;
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

       // --- LOGIC BOMB DECREMENT (Party Guess) ---
       if (attacker && attacker.silencedTurns && attacker.silencedTurns > 0) {
           await storage.updatePartyPlayer(attackerId, { silencedTurns: attacker.silencedTurns - 1 });
       }

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
               let pointsGained = 3;
               
               // --- BOUNTY CLAIM LOGIC ---
               if (game.subMode === 'bounty_contracts' && targetId === game.bountyTargetId) {
                   pointsGained += game.bountyPoints || 3;
                   updates.bountyTargetId = null;
                   updates.bountyPoints = null;
                   updates.nextBountyTurn = (game.turnCount || 0) + 1 + Math.floor(Math.random() * 3) + 3; // Reset with cooldown immediately
                   await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY CLAIMED] ${attacker.playerName} ASSASSINATED THE TARGET FOR +${pointsGained} PTS!`, type: 'success' });
               } else {
                   await storage.createPartyLog({ partyGameId: id, message: `SYSTEM: ${attacker.playerName} CRACKED ${target.playerName}! (+${pointsGained} PTS)`, type: 'success' });
               }

               currentAttackerPoints += pointsGained;
               await storage.updatePartyPlayer(attackerId, { points: currentAttackerPoints });
               
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

           // --- BOUNTY LIFECYCLE (GUESS) ---
           if (game.subMode === 'bounty_contracts') {
               const nextTurnCount = updates.turnCount !== undefined ? updates.turnCount : (game.turnCount || 0);
               const setupAlivePlayers = players.filter(p => !p.isEliminated && p.isSetup);
               const currentBountyTarget = updates.bountyTargetId !== undefined ? updates.bountyTargetId : game.bountyTargetId;
               const nextBountyTurn = updates.nextBountyTurn !== undefined ? updates.nextBountyTurn : (game.nextBountyTurn || 1);

               if (currentBountyTarget) {
                   if (nextTurnCount >= nextBountyTurn) {
                       updates.bountyTargetId = null;
                       updates.bountyPoints = null;
                       updates.nextBountyTurn = nextTurnCount + Math.floor(Math.random() * 3) + 3;
                       await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY EXPIRED] The target survived! Cooldown initiated.`, type: 'warning' });
                   }
               } else if (nextTurnCount >= nextBountyTurn && setupAlivePlayers.length > 1) {
                   const randomTarget = setupAlivePlayers[Math.floor(Math.random() * setupAlivePlayers.length)];
                   updates.bountyTargetId = randomTarget.id;
                   updates.bountyPoints = 3;
                   updates.nextBountyTurn = nextTurnCount + players.length;
                   await storage.createPartyLog({ partyGameId: id, message: `[BOUNTY ISSUED] ${randomTarget.playerName} IS THE NEW TARGET! (+6 PTS)`, type: 'warning' });
               }
           }
       }

       await storage.updatePartyGame(id, updates);
       res.json({ hits, blips });
    } catch (err) { res.status(400).json({ message: 'Invalid input' }); }
  });
// ==========================================
  // 2V2 TEAM MODE ROUTES
  // ==========================================

  app.post('/api/team/create', async (req, res) => {
    const { customSettings } = req.body;
    const game = await storage.createTeamGame(customSettings);
    res.status(201).json({ id: game.id, roomId: game.roomId });
  });

  app.post('/api/team/join', async (req, res) => {
    const { roomId, playerName, playerColor, team } = req.body; // team should be 'A' or 'B'
    
    const game = await storage.getTeamGameByRoomId(roomId);
    if (!game) return res.status(404).json({ message: 'Room not found' });
    if (game.status !== 'waiting') return res.status(400).json({ message: 'Game already started or finished' });
    
    const players = await storage.getTeamPlayers(game.id);
    const teamPlayersCount = players.filter(p => p.team === team).length;
    
    if (teamPlayersCount >= 2) return res.status(400).json({ message: `Team ${team} is full` });
    if (players.some(p => p.playerName === playerName)) return res.status(400).json({ message: 'Name already taken' });
    
    const player = await storage.addTeamPlayer(game.id, team, playerName, playerColor);
    res.json({ gameId: game.id, playerId: player.id, team });
  });

  app.get('/api/team/:id', async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getTeamGame(id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const players = await storage.getTeamPlayers(id);
    const guesses = await storage.getTeamGuesses(id);
    const logs = await storage.getTeamLogs(id);
    
    let timeLeft = 0;
    if (game.customTimer && game.status === 'playing') {
        const turnStart = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : new Date().getTime();
        const elapsed = Math.floor((new Date().getTime() - turnStart) / 1000);
        timeLeft = Math.max(0, 30 - elapsed);
    }
    
    res.json({ ...game, players, guesses, logs, timeLeft });
  });

  // 1. مسار حفظ الأرقام (Lock)
  app.post('/api/team/:id/lock', async (req, res) => {
    try {
      const { playerId, partialCode, powerups } = req.body;
      if (!partialCode || partialCode.length !== 3) return res.status(400).json({ message: 'Invalid code' });
      if (!powerups || powerups.length !== 4) return res.status(400).json({ message: 'You must select exactly 4 abilities' });

      const id = Number(req.params.id);
      const player = await storage.getTeamPlayer(playerId);
      
      // --- التعديل هنا: التأكد إن اللاعب موجود ---
      if (!player) return res.status(400).json({ message: 'Player not found' });

      const allPlayers = await storage.getTeamPlayers(id);
      const partner = allPlayers.find(p => p.team === player.team && p.id !== playerId);

      // التأكد إن مفيش تكرار للقدرات مع الزميل لو هو اختار قبلك
      if (partner && partner.equippedPowerups) {
         const partnerPws = JSON.parse(partner.equippedPowerups);
         const overlap = powerups.some((pw: string) => partnerPws.includes(pw));
         if (overlap) return res.status(400).json({ message: 'Conflict! Partner already locked one of these abilities.' });
      }

      await storage.updateTeamPlayer(playerId, { partialCode, equippedPowerups: JSON.stringify(powerups) });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error locking loadout' }); }
  });

  // 2. مسار الجاهزية وبدء الجيم (Ready)
  app.post('/api/team/:id/ready', async (req, res) => {
    try {
      const id = Number(req.params.id); 
      const { playerId } = req.body;
      await storage.updateTeamPlayer(playerId, { isSetup: true });
      
      const game = await storage.getTeamGame(id);
      const players = await storage.getTeamPlayers(id);
      
      // Check if all 4 players are setup
      if (players.length === 4 && players.every(p => p.isSetup)) {
          // Merge codes for Team A
          const teamA = players.filter(p => p.team === 'A');
          const teamACode = (teamA[0].partialCode || "000") + (teamA[1].partialCode || "000");
          
          // Merge codes for Team B
          const teamB = players.filter(p => p.team === 'B');
          const teamBCode = (teamB[0].partialCode || "000") + (teamB[1].partialCode || "000");

          await storage.updateTeamGame(id, {
             status: 'playing',
             teamACode,
             teamBCode,
             turnTeam: 'A',
             activePlayerIdA: teamA[0].id, // First player in Team A starts
             activePlayerIdB: teamB[0].id, // First player in Team B (for their turn)
             turnStartedAt: new Date()
          });
          
          await storage.createTeamLog({ teamGameId: id, message: `SYSTEM: ALL TEAMS READY. 6-DIGIT MASTER CODES LOCKED. LET THE HACKING BEGIN!`, type: 'warning' });
      }
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error in ready state' }); }
  });

  // 3. مسار الشات الخاص بالتيم (Team Chat)
  app.post('/api/team/:id/chat', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { playerId, message } = req.body;
      const player = await storage.getTeamPlayer(playerId);
      if (player) {
        await storage.createTeamLog({
            teamGameId: id, 
            type: `chat_${player.team}`, // يتم حفظه بنوع خاص بالفريق عشان الواجهة تفلتره
            message: `${player.playerName}: ${message}`
        });
      }
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: 'Error sending message' }); }
  });

  // ==========================================
  // 4. مسار التخمين (EXECUTE HACK)
  // ==========================================
  app.post('/api/team/:id/guess', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { attackerId, guess } = req.body; 
      
      const game = await storage.getTeamGame(id);
      if (!game || game.status !== 'playing') return res.status(400).json({ message: 'Game not active' });
      
      const attacker = await storage.getTeamPlayer(attackerId);
      if (!attacker) return res.status(400).json({ message: 'Attacker not found' });
      if (game.turnTeam !== attacker.team) return res.status(400).json({ message: 'Not your team turn' });
      
      const activeOperatorId = attacker.team === 'A' ? game.activePlayerIdA : game.activePlayerIdB;
      if (activeOperatorId !== attacker.id) return res.status(400).json({ message: 'Not your turn to execute!' });

      const targetTeam = attacker.team === 'A' ? 'B' : 'A';
      const targetCode = targetTeam === 'A' ? game.teamACode : game.teamBCode;

      // --- LOGIC BOMB DECREMENT (خصم دور الصمت) ---
      if (attacker.silencedTurns && attacker.silencedTurns > 0) {
          await storage.updateTeamPlayer(attacker.id, { silencedTurns: attacker.silencedTurns - 1 });
      }

      let hits = 0; let blips = 0;
      const guessArr = guess.split(''); const targetArr = targetCode!.split('');
      const usedInTarget = new Array(6).fill(false); const usedInGuess = new Array(6).fill(false);

      for (let i = 0; i < 6; i++) {
        if (guessArr[i] === targetArr[i]) { hits++; usedInTarget[i] = true; usedInGuess[i] = true; }
      }
      for (let i = 0; i < 6; i++) {
        if (!usedInGuess[i]) {
          for (let j = 0; j < 6; j++) {
            if (!usedInTarget[j] && guessArr[i] === targetArr[j]) { blips++; usedInTarget[j] = true; break; }
          }
        }
      }

      let displayHits = hits;
      let displayBlips = blips;

      const allPlayers = await storage.getTeamPlayers(id);
      const isTargetHoneypoted = allPlayers.some(p => p.team === targetTeam && p.isHoneypoted);

      // --- تطبيق تأثيرات الـ EMP والـ HONEYPOT ---
      if (hits !== 6) {
          if (attacker.isJammed) {
              displayHits = -1; displayBlips = -1;
              await storage.updateTeamPlayer(attacker.id, { isJammed: false });
          } else if (isTargetHoneypoted) {
              displayHits = hits > 0 ? 0 : 1; 
              displayBlips = blips > 0 ? 0 : (hits === 0 ? 2 : 1);
              // مسح الفخ من الفريق المستهدف بعد ما اشتغل
              for (const p of allPlayers) {
                  if (p.team === targetTeam && p.isHoneypoted) await storage.updateTeamPlayer(p.id, { isHoneypoted: false });
              }
          }
      }

      await storage.createTeamGuess({ teamGameId: id, attackerId: attacker.id, team: attacker.team, guess, hits: displayHits, blips: displayBlips });

      let logMessage = displayHits === -1 
        ? `[TEAM ${attacker.team}] ${attacker.playerName} HACKED ENEMY: ${guess} >> HITS: ░░ | BLIPS: ░░ [JAMMED]`
        : `[TEAM ${attacker.team}] ${attacker.playerName} HACKED ENEMY: ${guess} >> HITS: ${displayHits} | BLIPS: ${displayBlips}`;

      if (hits === 6) {
        await storage.updateTeamGame(id, { status: 'finished', winnerTeam: attacker.team });
        await storage.createTeamLog({ teamGameId: id, message: `CRITICAL ALERT: TEAM ${attacker.team} CRACKED THE 6-DIGIT MASTER CODE AND WON!`, type: 'success' });
      } else {
        const teamMembers = allPlayers.filter(p => p.team === attacker.team);
        const nextOperator = teamMembers.find(p => p.id !== attacker.id) || attacker; 
        
        const updates: any = { turnTeam: targetTeam, turnCount: (game.turnCount || 0) + 1, turnStartedAt: new Date() };
        if (attacker.team === 'A') updates.activePlayerIdA = nextOperator.id;
        if (attacker.team === 'B') updates.activePlayerIdB = nextOperator.id;

        await storage.updateTeamGame(id, updates);
        await storage.createTeamLog({ teamGameId: id, message: logMessage, type: 'warning' });
      }

      res.json({ success: true, hits, blips });
    } catch (err) { res.status(400).json({ message: 'Error processing hack' }); }
  });

  // ==========================================
  // 5. مسار تفعيل الباور-أبس (POWERUPS)
  // ==========================================

  app.post('/api/team/:id/powerup', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { attackerId, type, targetIndex, newDigit, swapIndex1, swapIndex2 } = req.body;

      const game = await storage.getTeamGame(id);
      const attacker = await storage.getTeamPlayer(attackerId);
      if (!game || !attacker) return res.status(400).json({ message: 'Invalid data' });

      const activeOperatorId = attacker.team === 'A' ? game.activePlayerIdA : game.activePlayerIdB;
      if (game.turnTeam !== attacker.team || activeOperatorId !== attacker.id) {
          return res.status(400).json({ message: 'Not your turn to use powerups!' });
      }

      // --- 🔴 التعديل هنا: منع القدرات لو اللاعب مضروب بـ Logic Bomb ---
      if (attacker.silencedTurns && attacker.silencedTurns > 0) {
          return res.status(400).json({ message: 'SYSTEM JAMMED: You are SILENCED and cannot use abilities!' });
      }

      // التأكد إن القدرة دي موجودة في اللود-أوت بتاع اللاعب
      const equipped = attacker.equippedPowerups ? JSON.parse(attacker.equippedPowerups) : [];
      if (!equipped.includes(type)) {
          return res.status(400).json({ message: 'Ability not equipped in your loadout!' });
      }

      let logMessage = "";
      const targetTeam = attacker.team === 'A' ? 'B' : 'A';
      const myCode = attacker.team === 'A' ? game.teamACode : game.teamBCode;
      const targetCode = targetTeam === 'A' ? game.teamACode : game.teamBCode;
      const allPlayers = await storage.getTeamPlayers(id);
      
      const gameUpdates: any = {};
      const attackerUpdates: any = {};

      if (type === 'firewall') {
          if (attacker.firewallUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.firewallUsed = true;
          logMessage = `🛡️ SYSTEM: TEAM ${attacker.team} ACTIVATED FIREWALL!`;
      } else if (type === 'timeHack') {
          if (attacker.timeHackUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.timeHackUsed = true;
          gameUpdates.turnStartedAt = new Date(Date.now() - 20000);
          logMessage = `⏱️ SYSTEM: TEAM ${attacker.team} LAUNCHED DDOS ATTACK! ENEMY TIME REDUCED BY 20S.`;
      } else if (type === 'virus') {
          if (attacker.virusUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.virusUsed = true;
          await db.update(teamLogs).set({ isCorrupted: true }).where(and(eq(teamLogs.teamGameId, id), like(teamLogs.message, `%>> HITS:%`), like(teamLogs.message, `%[TEAM ${targetTeam}]%`)));
          logMessage = `🦠 SYSTEM: TEAM ${attacker.team} DEPLOYED VIRUS! ENEMY HACK HISTORY CORRUPTED.`;
      } else if (type === 'bruteforce') {
          if (attacker.bruteforceUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.bruteforceUsed = true;
          logMessage = `⚡ SYSTEM: TEAM ${attacker.team} USED BRUTEFORCE. 1ST ENEMY DIGIT IS [${targetCode![0]}].`;
      } else if (type === 'emp') {
          if (attacker.empUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.empUsed = true;
          for (const p of allPlayers) { if (p.team === targetTeam) await storage.updateTeamPlayer(p.id, { isJammed: true }); }
          logMessage = `📡 SYSTEM: TEAM ${attacker.team} TRIGGERED EMP! ENEMY TEAM SIGNAL JAMMED.`;
      } else if (type === 'spyware') {
          if (attacker.spywareUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.spywareUsed = true;
          const codeSum = targetCode!.split('').reduce((acc, curr) => acc + parseInt(curr), 0);
          logMessage = `👁️ SYSTEM: TEAM ${attacker.team} DEPLOYED SPYWARE. ENEMY CODE SUM = ${codeSum}`;
      } else if (type === 'changeDigit') {
          if (attacker.changeDigitUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.changeDigitUsed = true;
          let codeArr = myCode!.split(''); codeArr[targetIndex] = newDigit.toString();
          if (attacker.team === 'A') gameUpdates.teamACode = codeArr.join(''); else gameUpdates.teamBCode = codeArr.join('');
          logMessage = `✍️ SYSTEM: TEAM ${attacker.team} MUTATED THEIR MASTER CODE!`;
      } else if (type === 'swapDigits') {
          if (attacker.swapDigitsUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.swapDigitsUsed = true;
          let codeArr = myCode!.split(''); const temp = codeArr[swapIndex1]; codeArr[swapIndex1] = codeArr[swapIndex2]; codeArr[swapIndex2] = temp;
          if (attacker.team === 'A') gameUpdates.teamACode = codeArr.join(''); else gameUpdates.teamBCode = codeArr.join('');
          logMessage = `🔀 SYSTEM: TEAM ${attacker.team} SHUFFLED THEIR MASTER CODE!`;
      } else if (type === 'logicBomb') {
          if (attacker.logicBombUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.logicBombUsed = true;
          // إسكات كل لاعبي الفريق التاني
          for (const p of allPlayers) { if (p.team === targetTeam) await storage.updateTeamPlayer(p.id, { silencedTurns: 2 }); }
          logMessage = `💣 [LOGIC BOMB] TEAM ${attacker.team} THREW A LOGIC BOMB! ENEMY TEAM SILENCED FOR 2 TURNS!`;
      } else if (type === 'phishing') {
          if (attacker.phishingUsed) return res.status(400).json({ message: 'Already used' });
          attackerUpdates.phishingUsed = true;
          const enemyPlayers = allPlayers.filter(p => p.team === targetTeam);
          let allEnemyEquipped: string[] = [];
          enemyPlayers.forEach(ep => { if (ep.equippedPowerups) allEnemyEquipped.push(...JSON.parse(ep.equippedPowerups).filter((pw:string) => !(ep as any)[`${pw}Used`])); });
          if (allEnemyEquipped.length === 0) { logMessage = `🎣 SYSTEM: TEAM ${attacker.team} LAUNCHED PHISHING, BUT ENEMY ARSENAL IS EMPTY!`; } 
          else {
              const stolenType = allEnemyEquipped[Math.floor(Math.random() * allEnemyEquipped.length)];
              const victim = enemyPlayers.find(ep => ep.equippedPowerups && JSON.parse(ep.equippedPowerups).includes(stolenType));
              if (victim) await storage.updateTeamPlayer(victim.id, { [`${stolenType}Used`]: true });
              attackerUpdates[`${stolenType}Used`] = false; 
              equipped.push(stolenType);
              attackerUpdates.equippedPowerups = JSON.stringify(equipped);
              logMessage = `🎣 SYSTEM: TEAM ${attacker.team} DEPLOYED PHISHING AND STOLE [${stolenType.toUpperCase()}]!`;
          }
      }

      await storage.updateTeamPlayer(attackerId, attackerUpdates);
      if (Object.keys(gameUpdates).length > 0) await storage.updateTeamGame(id, gameUpdates);
      await storage.createTeamLog({ teamGameId: id, message: logMessage, type: 'warning' });
      res.json({ success: true });

    } catch (err) { res.status(400).json({ message: 'Error using powerup' }); }
  });

  return httpServer;
}
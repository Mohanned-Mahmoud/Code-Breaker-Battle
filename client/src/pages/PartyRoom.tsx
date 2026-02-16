import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Share2, Lock, Terminal, Crosshair, Skull, Crown, Ghost, Users, Activity, Shield, Bug, Zap, Edit2, Shuffle, Radio, Eye, Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function UnifiedCyberInput({ value, onChange, disabled, colorTheme = "fuchsia" }: { value: string, onChange: (val: string) => void, disabled?: boolean, colorTheme?: "fuchsia" | "red" }) {
  const paddedValue = value.padEnd(4, ' ');
  const chars = paddedValue.split('');
  const digits = [chars[0], chars[1], chars[2], chars[3]];
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const themeBorder = colorTheme === "red" ? "border-red-500" : "border-fuchsia-500";
  const themeBorderDim = colorTheme === "red" ? "border-red-500/50" : "border-fuchsia-500/50";
  const themeText = colorTheme === "red" ? "text-red-500" : "text-fuchsia-500";

  return (
    <div className="flex gap-2 sm:gap-4 justify-center">
      {digits.map((digit, i) => {
         if (activeIndex === i && !disabled) {
           return (
             <input 
               key={i} autoFocus 
               className={cn("w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white text-black text-center text-xl sm:text-2xl font-bold rounded-sm outline-none border-2", themeBorder)} 
               maxLength={1} 
               onChange={(e) => { 
                 const val = e.target.value; 
                 if (/^\d$/.test(val)) { 
                    const newArr = [...digits];
                    newArr[i] = val;
                    onChange(newArr.join(''));
                    if (i < 3) setActiveIndex(i + 1);
                    else setActiveIndex(null);
                 } 
               }}
               onKeyDown={(e) => {
                 if (e.key === 'Backspace') {
                    const newArr = [...digits];
                    newArr[i] = ' '; 
                    onChange(newArr.join(''));
                    if (i > 0) setActiveIndex(i - 1);
                 }
               }}
               onBlur={() => setActiveIndex(null)}
             />
           );
         }
         
         const isEmpty = digit.trim() === '';
         return (
           <button 
             key={i} 
             disabled={disabled}
             className={cn("w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black text-center text-xl sm:text-2xl font-bold rounded-sm border-2 transition-all outline-none", 
                disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105", 
                activeIndex === i ? "border-white text-white scale-110" : cn(themeBorderDim, themeText)
             )} 
             onClick={() => setActiveIndex(i)}
           >
             {isEmpty ? "?" : digit}
           </button>
         );
      })}
    </div>
  );
}

function TerminalLog({ logs }: { logs: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs]);
  return (
    <div ref={scrollRef} className="font-mono text-[10px] sm:text-xs w-full h-[200px] md:h-[250px] overflow-y-auto p-3 sm:p-4 bg-black/60 border border-fuchsia-500/20 rounded-sm custom-scrollbar relative">
      <div className="flex flex-col-reverse space-y-reverse space-y-2">
        <AnimatePresence initial={false}>
          {logs.slice().reverse().map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={cn("flex-1 break-words font-medium", log.type === 'success' ? 'text-green-500' : log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-fuchsia-500/70')}>
                {">"} {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PartyRoom() {
  const [, params] = useRoute("/party/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const id = parseInt(params?.id || "0");
  const [playerName, setPlayerName] = useState("");
  
  const [setupDigits, setSetupDigits] = useState(['', '', '', '']);
  const [guessDigits, setGuessDigits] = useState(['', '', '', '']);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

  const [powerupState, setPowerupState] = useState<{ active: 'change' | 'swap' | null; code: string; step1Index: number | null; }>({ active: null, code: "", step1Index: null });

  const [myPlayerId, setMyPlayerId] = useState<number | null>(() => {
    const saved = localStorage.getItem(`party_player_${id}`);
    return saved ? parseInt(saved) : null;
  });

  const { data: gameData, isLoading, error } = useQuery<any>({
    queryKey: ['partyGame', id],
    queryFn: async () => {
      const res = await fetch(`/api/party/${id}`);
      if (!res.ok) throw new Error("Game not found");
      return res.json();
    },
    refetchInterval: 1000
  });

  const joinMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/party/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: gameData?.roomId, playerName: name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Join failed");
      return data;
    },
    onSuccess: (data) => { setMyPlayerId(data.playerId); localStorage.setItem(`party_player_${id}`, data.playerId.toString()); queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); },
    onError: (err: any) => toast({ title: "ACCESS DENIED", description: err.message, variant: "destructive" })
  });

  const setupMutation = useMutation({
    mutationFn: async (codeStr: string) => {
      const res = await fetch(`/api/party/${id}/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId, code: codeStr }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Setup failed");
      return data;
    },
    onSuccess: () => { setSetupDigits(['', '', '', '']); queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); },
    onError: (err: any) => toast({ title: "ERROR", description: err.message, variant: "destructive" })
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/party/${id}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partyGame', id] })
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/party/${id}/restart`, { method: 'POST' });
      return await res.json();
    },
    onSuccess: () => {
      setSetupDigits(['', '', '', '']); setGuessDigits(['', '', '', '']); setSelectedTarget(null);
      queryClient.invalidateQueries({ queryKey: ['partyGame', id] });
    }
  });

  const guessMutation = useMutation({
    mutationFn: async (cleanGuess: string) => {
      const res = await fetch(`/api/party/${id}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attackerId: myPlayerId, targetId: selectedTarget, guess: cleanGuess }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Attack Failed");
      return data;
    },
    onSuccess: () => { setGuessDigits(['', '', '', '']); setSelectedTarget(null); queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); },
    onError: (err: any) => toast({ title: "HACK FAILED", description: err.message, variant: "destructive" })
  });

  const powerupMutation = useMutation({
    mutationFn: async (args: any) => {
      const res = await fetch(`/api/party/${id}/powerup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attackerId: myPlayerId, targetId: selectedTarget, ...args }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Powerup Failed");
      return data;
    },
    onSuccess: () => { toast({ title: "SYSTEM UPDATE", description: "Powerup Activated Successfully" }); setPowerupState({ active: null, code: "", step1Index: null }); queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); },
    onError: (err: any) => toast({ title: "ERROR", description: err.message, variant: "destructive" })
  });

  const timeoutMutation = useMutation({
    mutationFn: () => fetch(`/api/party/${id}/timeout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) }).then(res => res.json()),
    onSuccess: () => { toast({ title: "TIMEOUT", description: "You took too long! Turn skipped.", variant: "destructive" }); setGuessDigits(['', '', '', '']); setPowerupState({ active: null, code: "", step1Index: null }); queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); }
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/party/${id}/skip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Skip Failed");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partyGame', id] }),
    onError: (err: any) => toast({ title: "ERROR", description: err.message, variant: "destructive" })
  });

  const myPlayer = gameData?.players?.find((p: any) => p.id === myPlayerId);
  const isMyTurn = gameData?.status === 'playing' && gameData?.activePlayerId === myPlayerId;
  const isTimed = gameData?.customTimer;
  
  const ghostStrikesLeft = 2 - (myPlayer?.successfulDefenses || 0);
  const isGhostActive = myPlayer?.isGhost && myPlayer?.isEliminated && ghostStrikesLeft > 0;
  const canUsePowerup = isMyTurn || isGhostActive;

  const isBrokenTurn = isMyTurn && (myPlayer?.isEliminated || !myPlayer?.isSetup);

  const cleanSetupStr = setupDigits.join('').replace(/ /g, '');
  const isSetupReady = cleanSetupStr.length === 4;
  
  const cleanGuessStr = guessDigits.join('').replace(/ /g, '');
  const isGuessReady = cleanGuessStr.length === 4;

  useEffect(() => {
    if (isTimed && gameData?.status === 'playing' && isMyTurn) {
      if (gameData.timeLeft === 0 && !timeoutMutation.isPending) timeoutMutation.mutate();
    }
  }, [gameData?.timeLeft, isMyTurn, gameData?.status, isTimed]);

  const handlePowerupClick = (type: string) => {
      const requiresTarget = ['bruteforce', 'emp', 'spyware'].includes(type);
      if (requiresTarget && !selectedTarget) {
          toast({ title: "TARGET REQUIRED", description: `You must select an enemy target to use ${type.toUpperCase()}`, variant: "destructive" });
          return;
      }
      powerupMutation.mutate({ type });
  };

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="animate-spin text-fuchsia-500 w-10 h-10" /></div>;
  if (error || !gameData) return <div className="h-[100dvh] flex flex-col items-center justify-center bg-background text-fuchsia-500"><Skull className="w-16 h-16 mb-4 text-red-500 animate-pulse" /><h1 className="text-2xl font-mono">ROOM OFFLINE OR DESTROYED</h1><Button onClick={() => setLocation('/')} className="mt-4" variant="outline">RETURN TO BASE</Button></div>;

  const opponents = gameData.players?.filter((p: any) => p.id !== myPlayerId) || [];

  // --- LOBBY JOIN ---
  if (!myPlayerId || !myPlayer) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-4 bg-background overflow-y-auto">
        <div className="max-w-md w-full p-6 sm:p-8 border border-fuchsia-500/30 bg-black/60 shadow-[0_0_30px_rgba(232,121,249,0.1)] text-center space-y-6 my-auto">
          <Users className="w-12 h-12 mx-auto text-fuchsia-500 opacity-50" />
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-fuchsia-500">JOIN SQUAD</h1>
          <p className="text-[10px] sm:text-xs font-mono opacity-50 uppercase">Mode: {gameData.subMode.replace(/_/g, ' ')}</p>
          <input type="text" placeholder="ENTER ALIAS..." value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} maxLength={10} className="w-full bg-black/80 border border-fuchsia-500/50 text-fuchsia-500 px-4 py-3 font-mono text-center tracking-widest focus:outline-none focus:border-fuchsia-500 uppercase" />
          <Button className="w-full h-12 border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-500 hover:bg-fuchsia-500 hover:text-black font-bold tracking-widest" disabled={!playerName || joinMutation.isPending} onClick={() => joinMutation.mutate(playerName)}>INFILTRATE</Button>
        </div>
      </div>
    );
  }

  // --- WAITING LOBBY (SETUP) ---
  if (gameData.status === 'waiting') {
    const isHost = gameData.players[0]?.id === myPlayerId;
    const isRoomFull = gameData.players.length === gameData.maxPlayers;
    const allSetup = gameData.players.every((p: any) => p.isSetup);
    const canStart = isRoomFull && allSetup;
    
    return (
      // تم تغيير min-h-[100dvh] إلى h-[100dvh] هنا أيضاً
      <div className="h-[100dvh] w-full flex flex-col items-center p-4 bg-background overflow-y-auto custom-scrollbar relative">
        <div className="max-w-md w-full p-6 sm:p-8 border border-fuchsia-500/30 bg-black/60 shadow-[0_0_30px_rgba(232,121,249,0.1)] text-center flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden mt-6 sm:mt-10 mb-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50" />
          
          <div className="flex flex-col items-center w-full mt-2">
              <span className="text-[9px] sm:text-[10px] font-mono opacity-50 mb-1 tracking-[0.3em] text-fuchsia-500">PARTY ROOM ID</span>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] tracking-widest">{id}</span>
              
              <Button 
                variant="outline" 
                className="mt-4 w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold tracking-widest flex items-center justify-center gap-2 transition-all text-[10px] sm:text-xs" 
                onClick={() => { 
                  navigator.clipboard.writeText(window.location.href); 
                  toast({ title: "LINK COPIED!", description: "Send this link to your friends so they can join." }); 
                }}
              >
                  <Share2 className="w-4 h-4" /> COPY INVITE LINK
              </Button>
          </div>
          
          <p className="text-[10px] sm:text-xs font-mono opacity-60 mt-2">Hackers Connected: {gameData.players.length} / {gameData.maxPlayers}</p>
          <div className="w-full h-px bg-fuchsia-500/20"></div>

          <div className="w-full">
            {!myPlayer.isSetup ? (
              <div className="space-y-6 bg-fuchsia-500/5 p-3 sm:p-4 border border-fuchsia-500/20 rounded">
                <p className="text-xs sm:text-sm font-mono text-fuchsia-500">DEFINE YOUR 4-DIGIT KEY</p>
                <UnifiedCyberInput value={setupDigits.join('')} onChange={(val: string) => setSetupDigits(val.split(''))} disabled={setupMutation.isPending} colorTheme="fuchsia" />
                <Button className="w-full h-10 sm:h-12 bg-fuchsia-500/20 text-fuchsia-500 border border-fuchsia-500 hover:bg-fuchsia-500 hover:text-black mt-2 text-xs sm:text-sm" disabled={!isSetupReady || setupMutation.isPending} onClick={() => setupMutation.mutate(cleanSetupStr)}>LOCK KEY</Button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="p-3 sm:p-4 bg-green-900/20 border border-green-500/30 text-green-400 font-mono text-[10px] sm:text-sm tracking-widest rounded animate-pulse">KEY LOCKED. HACKER READY.</div>
                 
                 {isHost && (
                    <Button 
                      className={cn("w-full h-10 sm:h-12 font-black tracking-widest border transition-all text-[10px] sm:text-xs", canStart ? "bg-fuchsia-500 text-black hover:bg-fuchsia-400 border-fuchsia-500 shadow-[0_0_15px_rgba(232,121,249,0.4)]" : "bg-black text-fuchsia-500/50 border-fuchsia-500/20 cursor-not-allowed")} 
                      disabled={!canStart || startMutation.isPending} 
                      onClick={() => startMutation.mutate()}
                    >
                      {startMutation.isPending ? "INITIALIZING..." : !isRoomFull ? `WAITING FOR PLAYERS (${gameData.players.length}/${gameData.maxPlayers})` : !allSetup ? "WAITING FOR CODES" : "START BATTLE NOW"}
                    </Button>
                 )}
              </div>
            )}
          </div>

          <div className="text-left border-t border-fuchsia-500/20 pt-4 w-full">
            <h3 className="text-[10px] sm:text-xs font-mono opacity-50 mb-3 flex justify-between">
               <span>SQUAD MEMBERS:</span>
               {isHost && <span className="text-fuchsia-500">YOU ARE HOST</span>}
            </h3>
            <div className="flex flex-col gap-2 w-full">
              {gameData.players.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-[10px] sm:text-sm font-mono border-b border-fuchsia-500/10 pb-2">
                  <span className={p.id === myPlayerId ? "text-fuchsia-500 font-bold" : "text-fuchsia-500/70"}>
                    {p.playerName} {p.id === gameData.players[0].id && "👑"}
                  </span>
                  <span className={p.isSetup ? "text-green-500 text-[9px] sm:text-xs" : "text-yellow-500 text-[9px] sm:text-xs animate-pulse"}>
                    {p.isSetup ? "[ READY ]" : "[ CONFIGURING ]"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FINISHED SCREEN ---
  if (gameData.status === 'finished') {
    const winner = gameData.players.find((p:any) => p.id === gameData.winnerId);
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-4 text-center space-y-4 sm:space-y-6 bg-background overflow-y-auto">
        <Crown className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-500 animate-bounce" />
        <h1 className="text-3xl sm:text-5xl font-black glitch-effect uppercase text-yellow-500">{winner?.playerName || "SOMEONE"} WINS!</h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full max-w-xs sm:max-w-md">
          <Button variant="outline" className="border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500/10 w-full" onClick={() => setLocation('/')}>EXIT SQUAD ROOM</Button>
          <Button className="bg-fuchsia-500 text-black hover:bg-fuchsia-400 font-bold tracking-widest shadow-[0_0_15px_rgba(232,121,249,0.4)] w-full" onClick={() => restartMutation.mutate()} disabled={restartMutation.isPending}>
            {restartMutation.isPending ? "REBOOTING..." : "PLAY AGAIN"}
          </Button>
        </div>
      </div>
    );
  }

  const showFirewall = gameData.allowFirewall ?? true;
  const showVirus = gameData.allowVirus ?? true;
  const showBruteforce = gameData.allowBruteforce ?? true;
  const showChangeDigit = gameData.allowChangeDigit ?? true;
  const showSwapDigits = gameData.allowSwapDigits ?? true;
  const showEmp = gameData.allowEmp ?? false;
  const showSpyware = gameData.allowSpyware ?? false;
  const showHoneypot = gameData.allowHoneypot ?? false;
  const showTimer = gameData.customTimer ?? false;

  const activePowerupsEnabled = showFirewall || showVirus || showBruteforce || showChangeDigit || showSwapDigits || showEmp || showSpyware || showHoneypot || showTimer;

  // --- ACTIVE GAME GRID ---
  return (
    // السر كله في استخدام h-[100dvh] بدلاً من min-h-[100dvh] لكي يتفعل الـ Global Scrollbar
    <div className="h-[100dvh] w-full bg-background overflow-y-auto overflow-x-hidden custom-scrollbar relative p-2 md:p-4">
      
      <div className="flex flex-col gap-3 md:gap-4 max-w-7xl mx-auto w-full relative z-10 pb-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center border border-fuchsia-500/30 bg-black/40 p-2 sm:p-3 rounded gap-2 sm:gap-0">
           <div className="text-center sm:text-left order-2 sm:order-none">
              <h2 className="text-[10px] sm:text-xs md:text-sm font-mono tracking-widest text-fuchsia-500/70">OP: {gameData.subMode.toUpperCase().replace(/_/g, ' ')}</h2>
              <p className="text-sm sm:text-xl font-black text-fuchsia-500 tracking-widest">ROOM {gameData.roomId}</p>
           </div>
           <div className="text-center flex flex-col items-center order-1 sm:order-none border-b sm:border-none border-fuchsia-500/20 pb-2 sm:pb-0 w-full sm:w-auto">
              {isTimed && (
                <div className={cn("text-xl sm:text-2xl font-black font-mono tracking-widest transition-colors", (gameData.timeLeft ?? 30) <= 10 ? "text-red-500 animate-pulse" : "text-cyan-400")}>
                   00:{String(gameData.timeLeft ?? 0).padStart(2, '0')}
                </div>
              )}
              {isGhostActive ? (
                  <div className="px-3 sm:px-4 py-1 bg-purple-500 text-black font-black font-mono tracking-widest rounded animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)] text-[10px] sm:text-sm">
                     GHOST STRIKES: {ghostStrikesLeft}/2
                  </div>
              ) : isMyTurn ? (
                  <div className="px-3 sm:px-4 py-1 bg-fuchsia-500 text-black font-black font-mono tracking-widest rounded animate-pulse shadow-[0_0_15px_rgba(232,121,249,0.5)] text-[10px] sm:text-sm">YOUR TURN</div>
              ) : (
                  <div className="px-2 sm:px-4 py-1 border border-fuchsia-500/30 text-fuchsia-500/50 font-mono tracking-widest rounded text-[9px] sm:text-xs flex items-center gap-2"><Activity className="w-3 h-3 animate-spin" /> WAITING FOR {gameData.players.find((p:any)=>p.id===gameData.activePlayerId)?.playerName}</div>
              )}
           </div>
           <div className="text-center sm:text-right hidden sm:block order-3 sm:order-none">
              <h2 className="text-[10px] sm:text-xs font-mono tracking-widest text-fuchsia-500/50">MY ALIAS</h2>
              <p className={cn("text-sm sm:text-lg font-black tracking-widest", myPlayer.isEliminated ? "text-red-500 line-through" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]")}>{myPlayer.playerName}</p>
           </div>
        </div>

        {/* Content Layout (CSS Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Left Column (Targets & Inputs) */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
            
            <div className="border border-fuchsia-500/20 bg-black/20 p-3 sm:p-4 rounded flex flex-col">
              <h3 className="font-mono text-[10px] sm:text-sm tracking-widest mb-3 sm:mb-4 flex items-center gap-2 opacity-70 text-fuchsia-500"><Crosshair className="w-3 h-3 sm:w-4 sm:h-4"/> SELECT TARGET</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {opponents.map((opp: any) => {
                  const isSelected = selectedTarget === opp.id;
                  const isDead = opp.isEliminated;
                  const isRebooting = !opp.isSetup && !isDead;

                  return (
                    <button key={opp.id} disabled={isDead || isRebooting || (!canUsePowerup && !isMyTurn)} onClick={() => setSelectedTarget(opp.id)}
                      className={cn("relative p-2 sm:p-4 rounded border text-left font-mono transition-all flex flex-col justify-between overflow-hidden group min-h-[60px] sm:min-h-[80px]", isDead ? "border-red-900 bg-red-900/10 opacity-50 cursor-not-allowed grayscale" : isRebooting ? "border-yellow-900 bg-yellow-900/10 opacity-70 cursor-not-allowed grayscale" : isSelected ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(232,121,249,0.3)] scale-[1.02]" : "border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-black/50 hover:bg-white/5")}
                    >
                      {isDead && <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-950/80"><Skull className="w-6 h-6 sm:w-12 sm:h-12 text-red-500 opacity-80" /></div>}
                      {opp.isGhost && <Ghost className="absolute top-1 right-1 sm:top-2 sm:right-2 w-3 h-3 sm:w-5 sm:h-5 text-purple-500 opacity-50 z-20" />}
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full z-0 gap-1 sm:gap-0">
                        <span className="font-black tracking-widest text-[11px] sm:text-lg text-white truncate max-w-full">{opp.playerName}</span>
                        {gameData.winCondition === 'points' && <span className="text-yellow-400 font-bold text-[8px] sm:text-xs whitespace-nowrap">{opp.points || 0}/{gameData.targetPoints} PTS</span>}
                      </div>
                      <div className="text-[7px] sm:text-[10px] opacity-60 tracking-widest uppercase z-0 mt-1">
                        {isDead ? (opp.isGhost ? 'GHOST' : 'DEAD') : isRebooting ? 'REBOOTING' : 'ACTIVE'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-fuchsia-500/20 bg-black/20 p-3 sm:p-4 rounded flex flex-col">
               {!myPlayer.isEliminated || myPlayer.isGhost ? (
                 !myPlayer.isSetup ? (
                    <div className="p-4 sm:p-6 border border-red-500/50 bg-red-900/20 rounded flex flex-col items-center text-center space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                       <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-pulse" />
                       <div>
                         <h3 className="font-black tracking-widest text-red-500 text-base sm:text-lg">SYSTEM CRASHED!</h3>
                         <p className="text-[10px] sm:text-xs font-mono text-red-400/80 mb-2">Your key was compromised. Configure a new 4-digit key manually.</p>
                       </div>
                       <UnifiedCyberInput value={setupDigits.join('')} onChange={(val: string) => setSetupDigits(val.split(''))} colorTheme="red" disabled={setupMutation.isPending} />
                       <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full max-w-xs mt-2">
                          <Button className="w-full h-10 sm:h-12 bg-red-500 hover:bg-red-400 text-black font-black tracking-widest text-xs sm:text-sm" disabled={!isSetupReady || setupMutation.isPending} onClick={() => setupMutation.mutate(cleanSetupStr)}>
                            {setupMutation.isPending ? "REBOOTING..." : "REBOOT SYSTEM"}
                          </Button>
                          {isBrokenTurn && (
                             <Button variant="outline" className="w-full h-10 sm:h-12 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold text-xs sm:text-sm" onClick={() => skipMutation.mutate()} disabled={skipMutation.isPending}>
                               SKIP TURN {">>"}
                             </Button>
                          )}
                       </div>
                    </div>
                 ) : (
                   <>
                     {!activePowerupsEnabled ? (
                        <div className="text-[10px] font-mono opacity-30 border border-fuchsia-500/10 p-2 rounded w-full text-center mb-4">NO POWERUPS ENABLED IN THIS ROOM</div>
                     ) : powerupState.active ? (
                        <div className="p-3 sm:p-4 border border-blue-500/30 bg-black/60 rounded flex flex-col items-center gap-3 sm:gap-4 mb-4">
                          <p className="text-[10px] sm:text-xs font-mono text-blue-400 animate-pulse">{powerupState.active === 'change' ? "SELECT DIGIT TO MUTATE" : "SELECT TWO DIGITS TO SWAP"}</p>
                          <div className="flex gap-2 sm:gap-4">
                            {powerupState.code.split('').map((digit, i) => {
                               if (powerupState.active === 'change' && powerupState.step1Index === i) {
                                 return <input key={i} autoFocus className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-black text-center text-lg sm:text-xl font-bold rounded-sm outline-none border-2 border-blue-500" maxLength={1} onChange={(e) => { const val = e.target.value; if (/^\d$/.test(val)) { powerupMutation.mutate({ type: 'changeDigit', targetIndex: i, newDigit: val }); setPowerupState({ active: null, code: "", step1Index: null }); } }} />;
                               }
                               const isSelected = powerupState.step1Index === i;
                               return <button key={i} className={cn("w-10 h-10 sm:w-12 sm:h-12 bg-black text-center text-lg sm:text-xl font-bold rounded-sm border-2 transition-all outline-none", isSelected ? "border-white text-white scale-110" : "border-primary/50 text-primary/50")} onClick={() => { if (powerupState.active === 'change') setPowerupState(p => ({ ...p, step1Index: i })); else if (powerupState.active === 'swap') { if (powerupState.step1Index === null) setPowerupState(p => ({ ...p, step1Index: i })); else { powerupMutation.mutate({ type: 'swapDigits', swapIndex1: powerupState.step1Index, swapIndex2: i }); setPowerupState({ active: null, code: "", step1Index: null }); } } }}>{digit}</button>;
                            })}
                          </div>
                          <Button variant="ghost" className="text-[10px] sm:text-xs text-red-400" onClick={() => setPowerupState({ active: null, code: "", step1Index: null })}>ABORT</Button>
                        </div>
                     ) : (
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 mb-4">
                          {showFirewall && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-yellow-500/50 text-yellow-500 text-[9px] sm:text-[10px] hover:bg-yellow-500/10" disabled={!canUsePowerup || myPlayer.firewallUsed} onClick={() => handlePowerupClick('firewall')}><Shield className="w-3 h-3 mr-1" /> FIREWALL</Button>}
                          {showVirus && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-green-500/50 text-green-500 text-[9px] sm:text-[10px] hover:bg-green-500/10" disabled={!canUsePowerup || myPlayer.virusUsed} onClick={() => handlePowerupClick('virus')}><Bug className="w-3 h-3 mr-1" /> VIRUS</Button>}
                          {showTimer && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-orange-500/50 text-orange-500 text-[9px] sm:text-[10px] hover:bg-orange-500/10" disabled={!canUsePowerup || myPlayer.timeHackUsed} onClick={() => handlePowerupClick('timeHack')}><Timer className="w-3 h-3 mr-1" /> DDOS -20S</Button>}
                          {showBruteforce && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-red-500/50 text-red-500 text-[9px] sm:text-[10px] hover:bg-red-500/10" disabled={!canUsePowerup || myPlayer.bruteforceUsed} onClick={() => handlePowerupClick('bruteforce')}><Zap className="w-3 h-3 mr-1" /> BRUTEFORCE</Button>}
                          {showChangeDigit && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-blue-500/50 text-blue-500 text-[9px] sm:text-[10px] hover:bg-blue-500/10" disabled={!canUsePowerup || myPlayer.changeDigitUsed} onClick={() => setPowerupState({ active: 'change', code: myPlayer.code || '0000', step1Index: null })}><Edit2 className="w-3 h-3 mr-1" /> CHANGE</Button>}
                          {showSwapDigits && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-purple-500/50 text-purple-500 text-[9px] sm:text-[10px] hover:bg-purple-500/10" disabled={!canUsePowerup || myPlayer.swapDigitsUsed} onClick={() => setPowerupState({ active: 'swap', code: myPlayer.code || '0000', step1Index: null })}><Shuffle className="w-3 h-3 mr-1" /> SWAP</Button>}
                          {showEmp && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-cyan-500/50 text-cyan-500 text-[9px] sm:text-[10px] hover:bg-cyan-500/10" disabled={!canUsePowerup || myPlayer.empUsed} onClick={() => handlePowerupClick('emp')}><Radio className="w-3 h-3 mr-1" /> EMP</Button>}
                          {showSpyware && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-emerald-500/50 text-emerald-500 text-[9px] sm:text-[10px] hover:bg-emerald-500/10" disabled={!canUsePowerup || myPlayer.spywareUsed} onClick={() => handlePowerupClick('spyware')}><Eye className="w-3 h-3 mr-1" /> SPYWARE</Button>}
                          {showHoneypot && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-indigo-500/50 text-indigo-500 text-[9px] sm:text-[10px] hover:bg-indigo-500/10" disabled={!canUsePowerup || myPlayer.honeypotUsed} onClick={() => handlePowerupClick('honeypot')}><Ghost className="w-3 h-3 mr-1" /> HONEYPOT</Button>}
                       </div>
                     )}

                     <div className="p-3 sm:p-4 border border-fuchsia-500/30 bg-black/60 rounded flex flex-col lg:flex-row items-center gap-3 sm:gap-4">
                        <div className="flex-1 w-full text-center lg:text-left">
                          <p className="text-[9px] sm:text-[10px] font-mono tracking-widest text-fuchsia-500/50 mb-1 sm:mb-2">TARGET: {selectedTarget ? opponents.find((o:any)=>o.id===selectedTarget)?.playerName : "NONE"}</p>
                          <UnifiedCyberInput value={guessDigits.join('')} onChange={(val: string) => setGuessDigits(val.split(''))} disabled={!isMyTurn || myPlayer.isEliminated || myPlayer.isGhost || !selectedTarget} colorTheme="fuchsia" />
                        </div>
                        
                        <div className="w-full lg:w-auto mt-2 lg:mt-0">
                          {isBrokenTurn ? (
                             <Button 
                               className="w-full h-12 md:h-16 px-4 sm:px-8 font-black tracking-widest font-mono text-sm sm:text-lg border-2 bg-yellow-500/20 text-yellow-500 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:bg-yellow-500 hover:text-black animate-pulse" 
                               onClick={() => skipMutation.mutate()}
                               disabled={skipMutation.isPending}
                             >
                               {skipMutation.isPending ? "SKIPPING..." : "SKIP TURN >>"}
                             </Button>
                          ) : (
                             <Button 
                               className={cn("w-full h-12 md:h-16 px-4 sm:px-8 font-black tracking-widest font-mono text-sm sm:text-lg border-2", selectedTarget && isGuessReady ? "bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-500 hover:text-black" : "bg-transparent text-fuchsia-500/30 border-fuchsia-500/20")} 
                               disabled={!isMyTurn || myPlayer.isEliminated || myPlayer.isGhost || !selectedTarget || !isGuessReady || guessMutation.isPending} 
                               onClick={() => guessMutation.mutate(cleanGuessStr)}
                             >
                               {guessMutation.isPending ? "HACKING..." : "ATTACK"}
                             </Button>
                          )}
                        </div>
                     </div>
                   </>
                 )
               ) : null}
            </div>
          </div>

          {/* Right Column (Status & Logs) */}
          <div className="flex flex-col gap-3 sm:gap-4">
             {myPlayer.isEliminated && (
               <div className="p-3 sm:p-4 border border-red-500 bg-red-900/20 rounded text-center animate-pulse flex flex-col items-center">
                  <Skull className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mb-1 sm:mb-2" />
                  <h3 className="font-black text-red-500 tracking-widest text-xs sm:text-base">SYSTEM COMPROMISED</h3>
                  {myPlayer.isGhost ? (
                      <div className="mt-1 sm:mt-2">
                          <p className="text-[10px] sm:text-xs font-mono text-purple-400">GHOST PROTOCOL ACTIVATED</p>
                          <p className="text-[8px] sm:text-[10px] font-mono text-purple-300/70 mt-1">You have <span className="text-white font-bold text-[10px] sm:text-sm">{ghostStrikesLeft}</span> strikes left to take revenge. Choose wisely!</p>
                      </div>
                  ) : (
                      <p className="text-[10px] sm:text-xs font-mono text-red-400/70 mt-1">SPECTATOR MODE</p>
                  )}
                  
                  {isBrokenTurn && (
                     <Button variant="outline" className="mt-3 sm:mt-4 w-full max-w-xs border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold text-xs sm:text-sm h-10" onClick={() => skipMutation.mutate()} disabled={skipMutation.isPending}>
                       SKIP TURN {">>"}
                     </Button>
                  )}
               </div>
             )}

             {gameData.winCondition === 'points' && (
               <div className="p-3 sm:p-4 border border-yellow-500/30 bg-yellow-500/10 rounded flex flex-col">
                  <span className="text-[9px] sm:text-[10px] font-mono text-yellow-500 mb-1">SCORE: {myPlayer.points || 0} / {gameData.targetPoints}</span>
                  <div className="w-full h-1.5 sm:h-2 bg-black rounded overflow-hidden border border-yellow-500/30"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${Math.min(100, ((myPlayer.points || 0) / gameData.targetPoints) * 100)}%` }} /></div>
               </div>
             )}

             <div className="flex flex-col border border-fuchsia-500/20 bg-black/20 rounded overflow-hidden">
               <div className="p-2 border-b border-fuchsia-500/20 bg-fuchsia-500/10 flex items-center gap-2">
                 <Terminal className="w-3 h-3 sm:w-4 sm:h-4 text-fuchsia-500" /><span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-fuchsia-500 uppercase">Global System Logs</span>
               </div>
               <TerminalLog logs={gameData.logs || []} />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
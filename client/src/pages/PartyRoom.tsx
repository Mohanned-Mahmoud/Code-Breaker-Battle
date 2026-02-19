import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Share2, Lock, Terminal, Crosshair, Skull, Crown, Ghost, Users, Activity, Shield, Bug, Zap, Edit2, Shuffle, Radio, Eye, Timer, Anchor, FileDown, Target, AlertTriangle, Bomb, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

function UnifiedCyberInput({ value, onChange, disabled, colorTheme = "fuchsia", isRamadan = false }: { value: string, onChange: (val: string) => void, disabled?: boolean, colorTheme?: "fuchsia" | "red" | "purple", isRamadan?: boolean }) {
  const paddedValue = value.padEnd(4, ' ');
  const chars = paddedValue.split('');
  const digits = [chars[0], chars[1], chars[2], chars[3]];
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Adjust theme colors based on Ramadan mode
  const activeColor = colorTheme === "red" ? "red" : (isRamadan ? "purple" : "fuchsia");
  
  const themeBorder = activeColor === "red" ? "border-red-500" : activeColor === "purple" ? "border-purple-500" : "border-fuchsia-500";
  const themeBorderDim = activeColor === "red" ? "border-red-500/50" : activeColor === "purple" ? "border-purple-500/50" : "border-fuchsia-500/50";
  const themeText = activeColor === "red" ? "text-red-500" : activeColor === "purple" ? "text-purple-400" : "text-fuchsia-500";

  return (
    <div className="flex gap-2 sm:gap-4 justify-center">
      {digits.map((digit, i) => {
         if (activeIndex === i && !disabled) {
           return (
             <input 
               key={i} autoFocus 
               inputMode="numeric"
               pattern="[0-9]*"
               type="text"
               className={cn("w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white text-black text-center text-xl sm:text-2xl font-bold rounded-sm outline-none border-2", themeBorder, isRamadan && "font-ramadan")} 
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
                activeIndex === i ? "border-white text-white scale-110" : cn(themeBorderDim, themeText),
                isRamadan && "font-ramadan"
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

function TerminalLog({ logs, players = [], isRamadan }: { logs: any[], players?: any[], isRamadan: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs]);

  const renderMessage = (msg: string) => {
    if (!players || players.length === 0) return msg;
    let parts = [{ text: msg, color: null as string | null }];
    
    players.forEach(p => {
      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.color) {
          newParts.push(part);
        } else {
          const split = part.text.split(p.playerName);
          split.forEach((s: string, i: number) => {
            newParts.push({ text: s, color: null });
            if (i < split.length - 1) {
              newParts.push({ text: p.playerName, color: p.playerColor || (isRamadan ? "#c084fc" : "#E879F9") });
            }
          });
        }
      });
      parts = newParts;
    });

    return parts.map((p, i) => p.color ? <span key={i} style={{ color: p.color }} className="font-bold">{p.text}</span> : <span key={i}>{p.text}</span>);
  };

  return (
    <div ref={scrollRef} className={cn("text-[10px] sm:text-xs w-full h-[200px] md:h-[250px] overflow-y-auto p-3 sm:p-4 bg-black/60 border rounded-sm custom-scrollbar relative", isRamadan ? "font-ramadan border-purple-500/20" : "font-mono border-fuchsia-500/20")}>
      <div className="flex flex-col-reverse space-y-reverse space-y-2">
        <AnimatePresence initial={false}>
          {logs.slice().reverse().map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={cn("flex-1 break-words font-medium", log.type === 'success' ? 'text-green-500' : log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : (isRamadan ? 'text-purple-400/70' : 'text-fuchsia-500/70'))}>
                {">"} {renderMessage(log.message)}
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
  const { theme } = useTheme();
  const isRamadan = theme === "ramadan";
  
  const id = parseInt(params?.id || "0");
  const [playerName, setPlayerName] = useState("");
  const COLORS = ["#E879F9", "#22D3EE", "#4ADE80", "#F87171", "#FBBF24", "#A78BFA"]; // Color Palette
  
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('preferred_hacker_color') || COLORS[0]);
  
  const [setupDigits, setSetupDigits] = useState(['', '', '', '']);
  const [guessDigits, setGuessDigits] = useState(['', '', '', '']);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

  const [powerupState, setPowerupState] = useState<{ active: 'change' | 'swap' | null; code: string; step1Index: number | null; }>({ active: null, code: "", step1Index: null });

  const [myPlayerId, setMyPlayerId] = useState<number | null>(() => {
    const saved = localStorage.getItem(`party_player_${id}`);
    return saved ? parseInt(saved) : null;
  });

  const downloadMasterLog = async () => {
    try {
      const res = await fetch(`/api/party/${id}/master-logs`);
      const masterLogs = await res.json();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast({ title: "POPUP BLOCKED", description: "Allow popups to download the log.", variant: "destructive" }); return; }

      let htmlContent = `
        <html>
          <head>
            <title>Party_Master_Log_${id}</title>
            <style>
              body { background-color: #050505; color: #00ff00; font-family: 'Courier New', Courier, monospace; padding: 40px; }
              .header { text-align: center; color: ${isRamadan ? '#c084fc' : '#E879F9'}; margin-bottom: 30px; letter-spacing: 2px; }
              .meta { color: #888; font-size: 12px; margin-bottom: 20px; border-bottom: 1px dashed #333; padding-bottom: 10px; }
              .log-entry { margin-bottom: 8px; line-height: 1.4; font-size: 14px; }
              .time { color: #555; margin-right: 10px; }
              .msg-success { color: #22c55e; }
              .msg-error { color: #ef4444; }
              .msg-warning { color: #eab308; }
              .msg-info { color: #aaaaaa; }
              .corrupted { opacity: 0.7; }
              .corrupted-tag { color: #ef4444; font-size: 10px; margin-left: 5px; border: 1px solid #ef4444; padding: 1px 4px; border-radius: 2px;}
              @media print { body { background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="header"><h2>SQUAD_WAR_OS // MASTER LOG ARCHIVE</h2></div>
            <div class="meta">ROOM ID: ${id} | EXTRACTION DATE: ${new Date().toLocaleString()} | STATUS: DECRYPTED</div>
      `;

      masterLogs.forEach((log: any) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          let msgClass = 'msg-info';
          if (log.type === 'success') msgClass = 'msg-success';
          else if (log.type === 'error') msgClass = 'msg-error';
          else if (log.type === 'warning') msgClass = 'msg-warning';

          let rawMessage = log.message;
          if (gameData?.players) {
            gameData.players.forEach((p: any) => {
               const split = rawMessage.split(p.playerName);
               if (split.length > 1) rawMessage = split.join(`<span style="color: ${p.playerColor || (isRamadan ? '#c084fc' : '#E879F9')}; font-weight: bold;">${p.playerName}</span>`);
            });
          }

          const corruptedMark = log.isCorrupted ? `<span class="corrupted-tag">RECOVERED FROM VIRUS</span>` : '';
          htmlContent += `<div class="log-entry ${log.isCorrupted ? 'corrupted' : ''}"><span class="time">[${time}]</span><span class="${msgClass}">> ${rawMessage}</span> ${corruptedMark}</div>`;
      });

      htmlContent += `<script>window.onload = () => { window.print(); }</script></body></html>`;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) { toast({ title: "ERROR", description: "Failed to fetch master logs.", variant: "destructive" }); }
  };

  const { data: gameData, isLoading, error } = useQuery<any>({
    queryKey: ['partyGame', id],
    queryFn: async () => {
      const res = await fetch(`/api/party/${id}`);
      if (!res.ok) throw new Error("Game not found");
      return res.json();
    },
    refetchInterval: 1000
  });

  const takenColors = gameData?.players?.map((p: any) => p.playerColor) || [];

  useEffect(() => {
    if (takenColors.includes(playerColor)) {
      const available = COLORS.find(c => !takenColors.includes(c));
      if (available) setPlayerColor(available);
    }
  }, [takenColors, playerColor, COLORS]);

  const joinMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/party/join', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ roomId: gameData?.roomId, playerName: name, playerColor }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Join failed");
      return data;
    },
    onSuccess: (data) => { setMyPlayerId(data.playerId); localStorage.setItem(`party_player_${id}`, data.playerId.toString()); localStorage.setItem('preferred_hacker_color', playerColor);queryClient.invalidateQueries({ queryKey: ['partyGame', id] }); },
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
      const requiresTarget = ['bruteforce', 'emp', 'spyware', 'logicBomb', 'phishing'].includes(type);
      if (requiresTarget && !selectedTarget) {
          toast({ title: "TARGET REQUIRED", description: `You must select an enemy target to use ${type.toUpperCase()}`, variant: "destructive" });
          return;
      }
      powerupMutation.mutate({ type });
  };

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center bg-background"><Loader2 className={cn("animate-spin w-10 h-10", isRamadan ? "text-purple-500" : "text-fuchsia-500")} /></div>;
  if (error || !gameData) return <div className={cn("h-[100dvh] flex flex-col items-center justify-center bg-background", isRamadan ? "text-purple-500" : "text-fuchsia-500")}><Skull className="w-16 h-16 mb-4 text-red-500 animate-pulse" /><h1 className={cn("text-2xl", isRamadan ? "font-ramadan" : "font-mono")}>ROOM OFFLINE OR DESTROYED</h1><Button onClick={() => setLocation('/')} className="mt-4" variant="outline">RETURN TO BASE</Button></div>;

  const opponents = gameData.players?.filter((p: any) => p.id !== myPlayerId) || [];

  // Define dynamic styles
  const primaryColor = isRamadan ? "text-purple-400" : "text-fuchsia-500";
  const primaryBorder = isRamadan ? "border-purple-500/30" : "border-fuchsia-500/30";
  const primaryBg = isRamadan ? "bg-purple-500/10" : "bg-fuchsia-500/10";
  const primaryHover = isRamadan ? "hover:bg-purple-500 hover:text-black" : "hover:bg-fuchsia-500 hover:text-black";
  const fontClass = isRamadan ? "font-ramadan" : "font-mono";

  // --- LOBBY JOIN ---
  if (!myPlayerId || !myPlayer) {
    return (
      <div className={cn("min-h-[100dvh] flex flex-col p-4 bg-background relative", fontClass)}>
        {isRamadan && (
          <div className="absolute inset-0 pointer-events-none opacity-10 z-0">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="islamic-geometry-party" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                  <path d="M100 0 L130 70 L200 100 L130 130 L100 200 L70 130 L0 100 L70 70 Z" fill="none" stroke="#a855f7" strokeWidth="0.8" />
                  <circle cx="100" cy="100" r="40" stroke="#a855f7" strokeWidth="0.2" strokeOpacity="0.5" />
                  <path d="M0 0 L200 200 M200 0 L0 200" stroke="#a855f7" strokeWidth="0.1" strokeOpacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-geometry-party)" />
            </svg>
          </div>
        )}
        <div className={cn("max-w-md w-full p-6 sm:p-8 border bg-black/60 text-center space-y-6 m-auto my-8 relative z-10", primaryBorder, isRamadan ? "shadow-[0_0_40px_rgba(168,85,247,0.15)] rounded-2xl" : "shadow-[0_0_30px_rgba(232,121,249,0.1)]")}>
          <Users className={cn("w-12 h-12 mx-auto opacity-50", primaryColor)} />
          <h1 className={cn("text-2xl sm:text-3xl font-black tracking-widest", primaryColor)}>JOIN SQUAD</h1>
          <p className="text-[10px] sm:text-xs opacity-50 uppercase">Mode: {gameData.subMode.replace(/_/g, ' ')}</p>
          <input type="text" placeholder="ENTER ALIAS..." value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} maxLength={10} className={cn("w-full bg-black/80 border px-4 py-3 text-center tracking-widest focus:outline-none uppercase", isRamadan ? "border-purple-500/50 text-purple-400 focus:border-purple-500 rounded-lg" : "border-fuchsia-500/50 text-fuchsia-500 focus:border-fuchsia-500")} />
          
          {/* COLOR PICKER */}
          <div className="flex justify-center gap-3 py-2">
            {COLORS.map(c => {
              const isTaken = takenColors.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => !isTaken && setPlayerColor(c)}
                  disabled={isTaken}
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all",
                    isTaken ? "opacity-10 cursor-not-allowed grayscale" : "hover:scale-110",
                    playerColor === c ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : (!isTaken && "border-transparent opacity-50")
                  )}
                  style={{ backgroundColor: c }}
                  title={isTaken ? "Color Taken" : "Select Color"}
                />
              );
            })}
          </div>

          <Button className={cn("w-full h-12 font-bold tracking-widest border", isRamadan ? "border-purple-500 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg" : "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-500 hover:bg-fuchsia-500 hover:text-black")} disabled={!playerName || joinMutation.isPending} onClick={() => joinMutation.mutate(playerName)}>INFILTRATE</Button>
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
      <div className={cn("min-h-[100dvh] w-full flex flex-col p-4 bg-background custom-scrollbar relative", fontClass)}>
        {isRamadan && (
          <div className="absolute inset-0 pointer-events-none opacity-10 z-0">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="islamic-geometry-party" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M100 0 L130 70 L200 100 L130 130 L100 200 L70 130 L0 100 L70 70 Z" fill="none" stroke="#a855f7" strokeWidth="0.8" /><circle cx="100" cy="100" r="40" stroke="#a855f7" strokeWidth="0.2" strokeOpacity="0.5" /><path d="M0 0 L200 200 M200 0 L0 200" stroke="#a855f7" strokeWidth="0.1" strokeOpacity="0.3" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#islamic-geometry-party)" />
            </svg>
          </div>
        )}
        <div className={cn("max-w-md w-full p-6 sm:p-8 border bg-black/60 text-center flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden m-auto my-8 z-10", primaryBorder, isRamadan ? "rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.15)]" : "shadow-[0_0_30px_rgba(232,121,249,0.1)]")}>
          <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent to-transparent opacity-50", isRamadan ? "via-purple-500" : "via-fuchsia-500")} />
          
          <div className="flex flex-col items-center w-full mt-2">
              <span className={cn("text-[9px] sm:text-[10px] opacity-50 mb-1 tracking-[0.3em]", primaryColor)}>PARTY ROOM ID</span>
              <span className={cn("text-4xl sm:text-5xl md:text-6xl font-black tracking-widest", isRamadan ? "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]")}>{id}</span>
              
              <Button 
                variant="outline" 
                className={cn("mt-4 w-full font-bold tracking-widest flex items-center justify-center gap-2 transition-all text-[10px] sm:text-xs", isRamadan ? "border-amber-500/50 text-amber-400 hover:bg-amber-500/10 rounded-lg" : "border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10")} 
                onClick={() => { 
                  navigator.clipboard.writeText(window.location.href); 
                  toast({ title: "LINK COPIED!", description: "Send this link to your friends so they can join." }); 
                }}
              >
                  <Share2 className="w-4 h-4" /> COPY INVITE LINK
              </Button>
          </div>
          
          <p className="text-[10px] sm:text-xs opacity-60 mt-2">Hackers Connected: {gameData.players.length} / {gameData.maxPlayers}</p>
          <div className={cn("w-full h-px", isRamadan ? "bg-purple-500/20" : "bg-fuchsia-500/20")}></div>

          <div className="w-full">
            {!myPlayer.isSetup ? (
              <div className={cn("space-y-6 p-3 sm:p-4 border rounded", isRamadan ? "bg-purple-500/5 border-purple-500/20" : "bg-fuchsia-500/5 border-fuchsia-500/20")}>
                <p className={cn("text-xs sm:text-sm", primaryColor)}>DEFINE YOUR 4-DIGIT KEY</p>
                <UnifiedCyberInput value={setupDigits.join('')} onChange={(val: string) => setSetupDigits(val.split(''))} disabled={setupMutation.isPending} colorTheme="fuchsia" isRamadan={isRamadan} />
                <Button className={cn("w-full h-10 sm:h-12 border mt-2 text-xs sm:text-sm", isRamadan ? "bg-purple-500/20 text-purple-400 border-purple-500 hover:bg-purple-500 hover:text-white" : "bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500 hover:bg-fuchsia-500 hover:text-black")} disabled={!isSetupReady || setupMutation.isPending} onClick={() => setupMutation.mutate(cleanSetupStr)}>LOCK KEY</Button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="p-3 sm:p-4 bg-green-900/20 border border-green-500/30 text-green-400 text-[10px] sm:text-sm tracking-widest rounded animate-pulse">KEY LOCKED. HACKER READY.</div>
                 
                 {isHost && (
                    <Button 
                      className={cn("w-full h-10 sm:h-12 font-black tracking-widest border transition-all text-[10px] sm:text-xs", canStart ? (isRamadan ? "bg-purple-500 text-white hover:bg-purple-400 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-fuchsia-500 text-black hover:bg-fuchsia-400 border-fuchsia-500 shadow-[0_0_15px_rgba(232,121,249,0.4)]") : (isRamadan ? "bg-black text-purple-500/50 border-purple-500/20 cursor-not-allowed" : "bg-black text-fuchsia-500/50 border-fuchsia-500/20 cursor-not-allowed"))} 
                      disabled={!canStart || startMutation.isPending} 
                      onClick={() => startMutation.mutate()}
                    >
                      {startMutation.isPending ? "INITIALIZING..." : !isRoomFull ? `WAITING FOR PLAYERS (${gameData.players.length}/${gameData.maxPlayers})` : !allSetup ? "WAITING FOR CODES" : "START BATTLE NOW"}
                    </Button>
                 )}
              </div>
            )}
          </div>

          <div className={cn("text-left border-t pt-4 w-full", isRamadan ? "border-purple-500/20" : "border-fuchsia-500/20")}>
            <h3 className="text-[10px] sm:text-xs opacity-50 mb-3 flex justify-between">
               <span>SQUAD MEMBERS:</span>
               {isHost && <span className={primaryColor}>YOU ARE HOST</span>}
            </h3>
            <div className="flex flex-col gap-2 w-full">
              {gameData.players.map((p: any) => (
                <div key={p.id} className={cn("flex justify-between items-center text-[10px] sm:text-sm border-b pb-2", isRamadan ? "border-purple-500/10" : "border-fuchsia-500/10")}>
                  <span className={p.id === myPlayerId ? "font-bold" : "opacity-80"} style={{ color: p.playerColor || (isRamadan ? '#c084fc' : '#E879F9') }}>
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
      <div className={cn("h-[100dvh] flex flex-col items-center justify-center p-4 text-center space-y-4 sm:space-y-6 bg-background overflow-y-auto", fontClass)}>
        <Crown className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-500 animate-bounce" />
        <h1 className="text-3xl sm:text-5xl font-black glitch-effect uppercase text-yellow-500">{winner?.playerName || "SOMEONE"} WINS!</h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full max-w-xs sm:max-w-2xl justify-center">
          <Button variant="outline" className={cn("border w-full", isRamadan ? "border-purple-500 text-purple-400 hover:bg-purple-500/10" : "border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500/10")} onClick={() => setLocation('/')}>EXIT ROOM</Button>
          
          <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 w-full" onClick={downloadMasterLog}><FileDown className="w-4 h-4 mr-2"/> ARCHIVE LOG</Button>

          <Button className={cn("text-black font-bold tracking-widest w-full", isRamadan ? "bg-purple-500 hover:bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-fuchsia-500 hover:bg-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.4)]")} onClick={() => restartMutation.mutate()} disabled={restartMutation.isPending}>
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
  const showLogicBomb = gameData.allowLogicBomb ?? false;
  const showTimer = gameData.customTimer ?? false;

  const activePowerupsEnabled = showFirewall || showVirus || showBruteforce || showChangeDigit || showSwapDigits || showEmp || showSpyware || showHoneypot || showTimer || showLogicBomb;

  const isHunted = gameData.subMode === 'bounty_contracts' && myPlayerId === gameData.bountyTargetId && !myPlayer.isEliminated;

  // --- ACTIVE GAME GRID ---
  return (
    <div className={cn("h-[100dvh] w-full bg-background overflow-y-auto overflow-x-hidden custom-scrollbar relative p-2 md:p-4", fontClass, isHunted && "shadow-[inset_0_0_100px_rgba(239,68,68,0.15)] transition-shadow duration-1000")}>
      
      {/* Background for Ramadan */}
      {isRamadan && (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
           <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="islamic-geometry-party" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M100 0 L130 70 L200 100 L130 130 L100 200 L70 130 L0 100 L70 70 Z" fill="none" stroke="#a855f7" strokeWidth="0.8" /><circle cx="100" cy="100" r="40" stroke="#a855f7" strokeWidth="0.2" strokeOpacity="0.5" /><path d="M0 0 L200 200 M200 0 L0 200" stroke="#a855f7" strokeWidth="0.1" strokeOpacity="0.3" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#islamic-geometry-party)" />
          </svg>
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-4 max-w-7xl mx-auto w-full relative z-10 pb-10">
        
        {/* NEW BOUNTY BANNER */}
        {gameData.subMode === 'bounty_contracts' && (
          <div className="w-full mb-1 animate-in fade-in duration-500">
            {gameData.bountyTargetId ? (
              <div className="p-2 sm:p-3 border border-yellow-500 bg-yellow-500/20 rounded flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(234,179,8,0.4)] relative overflow-hidden">
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,179,8,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
                 <Target className="w-5 h-5 text-yellow-500 animate-pulse relative z-10" />
                 <span className="font-black tracking-widest text-yellow-500 text-[10px] sm:text-xs relative z-10 text-center">
                    ACTIVE CONTRACT // TARGET: {gameData.players.find((p:any) => p.id === gameData.bountyTargetId)?.playerName} // REWARD: +6 PTS
                 </span>
              </div>
            ) : (
              <div className="p-2 sm:p-3 border border-blue-500/50 bg-blue-500/10 rounded flex items-center justify-center gap-3">
                 <Activity className="w-5 h-5 text-blue-400 animate-spin" />
                 <span className="font-bold tracking-widest text-blue-400 text-[10px] sm:text-xs opacity-80 text-center">
                    SCANNING NEURAL NET FOR TARGET // ETA: {Math.max(1, (gameData.nextBountyTurn || 1) - (gameData.turnCount || 0))} TURNS...
                 </span>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className={cn("flex flex-col sm:flex-row justify-between items-center border bg-black/40 p-2 sm:p-3 rounded gap-2 sm:gap-0", primaryBorder)}>
           <div className="text-center sm:text-left order-2 sm:order-none">
              <h2 className={cn("text-[10px] sm:text-xs md:text-sm tracking-widest", isRamadan ? "text-purple-400/70" : "text-fuchsia-500/70")}>OP: {gameData.subMode.toUpperCase().replace(/_/g, ' ')}</h2>
              <p className={cn("text-sm sm:text-xl font-black tracking-widest", primaryColor)}>ROOM {gameData.roomId}</p>
           </div>
           <div className={cn("text-center flex flex-col items-center order-1 sm:order-none border-b sm:border-none pb-2 sm:pb-0 w-full sm:w-auto", isRamadan ? "border-purple-500/20" : "border-fuchsia-500/20")}>
              {isTimed && (
                <div className={cn("text-xl sm:text-2xl font-black tracking-widest transition-colors", (gameData.timeLeft ?? 30) <= 10 ? "text-red-500 animate-pulse" : (isRamadan ? "text-amber-400" : "text-cyan-400"))}>
                   00:{String(gameData.timeLeft ?? 0).padStart(2, '0')}
                </div>
              )}
              {isGhostActive ? (
                  <div className={cn("px-3 sm:px-4 py-1 bg-purple-500 text-black font-black tracking-widest rounded animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)] text-[10px] sm:text-sm")}>
                     GHOST STRIKES: {ghostStrikesLeft}/2
                  </div>
              ) : isMyTurn ? (
                  <div className={cn("px-3 sm:px-4 py-1 text-black font-black tracking-widest rounded animate-pulse shadow-[0_0_15px_rgba(232,121,249,0.5)] text-[10px] sm:text-sm", isRamadan ? "bg-purple-500" : "bg-fuchsia-500")}>YOUR TURN</div>
              ) : (
                  <div className={cn("px-2 sm:px-4 py-1 border tracking-widest rounded text-[9px] sm:text-xs flex items-center gap-2", isRamadan ? "border-purple-500/30 text-purple-400/50" : "border-fuchsia-500/30 text-fuchsia-500/50")}><Activity className="w-3 h-3 animate-spin" /> WAITING FOR {gameData.players.find((p:any)=>p.id===gameData.activePlayerId)?.playerName}</div>
              )}
           </div>
           <div className="text-center sm:text-right hidden sm:block order-3 sm:order-none">
              <h2 className={cn("text-[10px] sm:text-xs tracking-widest", isRamadan ? "text-purple-400/50" : "text-fuchsia-500/50")}>MY ALIAS</h2>
              <p className={cn("text-sm sm:text-lg font-black tracking-widest", myPlayer.isEliminated ? "text-red-500 line-through" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]")} style={{ color: myPlayer.isEliminated ? undefined : (myPlayer.playerColor || (isRamadan ? '#c084fc' : '#E879F9')) }}>{myPlayer.playerName}</p>
           </div>
        </div>

        {/* Content Layout (CSS Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Left Column (Targets & Inputs) */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
            
            <div className={cn("border bg-black/20 p-3 sm:p-4 rounded flex flex-col", primaryBorder)}>
              <h3 className={cn("text-[10px] sm:text-sm tracking-widest mb-3 sm:mb-4 flex items-center gap-2 opacity-70", primaryColor)}><Crosshair className="w-3 h-3 sm:w-4 sm:h-4"/> SELECT TARGET</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {opponents.map((opp: any) => {
                  const isSelected = selectedTarget === opp.id;
                  const isDead = opp.isEliminated;
                  const isRebooting = !opp.isSetup && !isDead;
                  const isBountyTarget = gameData.subMode === 'bounty_contracts' && opp.id === gameData.bountyTargetId;

                  return (
                    <button key={opp.id} disabled={isDead || isRebooting || (!canUsePowerup && !isMyTurn)} onClick={() => setSelectedTarget(opp.id)}
                      className={cn("relative p-2 sm:p-4 rounded border text-left transition-all flex flex-col justify-between overflow-hidden group min-h-[60px] sm:min-h-[80px]", 
                        isDead ? "border-red-900 bg-red-900/10 opacity-50 cursor-not-allowed grayscale" : 
                        isRebooting ? "border-yellow-900 bg-yellow-900/10 opacity-70 cursor-not-allowed grayscale" : 
                        isBountyTarget ? "border-yellow-500 bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02] animate-pulse" :
                        isSelected ? (isRamadan ? "border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-[1.02]" : "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(232,121,249,0.3)] scale-[1.02]") : 
                        (isRamadan ? "border-purple-500/30 hover:border-purple-500/60 bg-black/50 hover:bg-white/5" : "border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-black/50 hover:bg-white/5")
                      )}
                    >
                      {isDead && <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-950/80"><Skull className="w-6 h-6 sm:w-12 sm:h-12 text-red-500 opacity-80" /></div>}
                      {opp.isGhost && <Ghost className="absolute top-1 right-1 sm:top-2 sm:right-2 w-3 h-3 sm:w-5 sm:h-5 text-purple-500 opacity-50 z-20" />}
                      
                      {isBountyTarget && (
                        <>
                           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(234,179,8,0.1)_10px,rgba(234,179,8,0.1)_20px)] z-0" />
                           <Target className="absolute -bottom-4 -right-4 w-16 h-16 text-yellow-500/20 animate-[spin_4s_linear_infinite] z-0 pointer-events-none" />
                           <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-yellow-500 text-black font-black text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-sm z-20 shadow-[0_0_10px_rgba(234,179,8,0.8)]">+6 PTS</div>
                        </>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full z-10 gap-1 sm:gap-0 relative">
                        <span className="font-black tracking-widest text-[11px] sm:text-lg truncate max-w-full" style={{ color: opp.playerColor || (isRamadan ? '#c084fc' : '#E879F9') }}>{opp.playerName}</span>
                        {gameData.winCondition === 'points' && <span className="text-yellow-400 font-bold text-[8px] sm:text-xs whitespace-nowrap">{opp.points || 0}/{gameData.targetPoints} PTS</span>}
                      </div>
                      <div className="text-[7px] sm:text-[10px] opacity-60 tracking-widest uppercase z-10 relative mt-1">
                        {isDead ? (opp.isGhost ? 'GHOST' : 'DEAD') : isRebooting ? 'REBOOTING' : 'ACTIVE'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={cn("border bg-black/20 p-3 sm:p-4 rounded flex flex-col relative", primaryBorder)}>
               
               {/* HUNTED WARNING ALERT */}
               {isHunted && (
                  <div className="p-3 sm:p-4 border border-red-500 bg-red-500/20 rounded flex flex-col items-center justify-center gap-2 shadow-[inset_0_0_20px_rgba(239,68,68,0.5)] mb-4 animate-pulse">
                     <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                     <span className="font-black tracking-widest text-red-500 text-[12px] sm:text-sm text-center">
                        WARNING: YOU ARE HUNTED!<br/>
                        <span className="text-[8px] sm:text-[10px] text-red-400">Survive the round or opponents will claim your bounty.</span>
                     </span>
                  </div>
               )}

               {!myPlayer.isEliminated || myPlayer.isGhost ? (
                 !myPlayer.isSetup ? (
                    <div className="p-4 sm:p-6 border border-red-500/50 bg-red-900/20 rounded flex flex-col items-center text-center space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                       <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-pulse" />
                       <div>
                         <h3 className="font-black tracking-widest text-red-500 text-base sm:text-lg">SYSTEM CRASHED!</h3>
                         <p className="text-[10px] sm:text-xs text-red-400/80 mb-2">Your key was compromised. Configure a new 4-digit key manually.</p>
                       </div>
                       <UnifiedCyberInput value={setupDigits.join('')} onChange={(val: string) => setSetupDigits(val.split(''))} colorTheme="red" isRamadan={isRamadan} disabled={setupMutation.isPending} />
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
                        <div className={cn("text-[10px] opacity-30 border p-2 rounded w-full text-center mb-4", isRamadan ? "border-purple-500/10" : "border-fuchsia-500/10")}>NO POWERUPS ENABLED IN THIS ROOM</div>
                     ) : powerupState.active ? (
                        <div className="p-3 sm:p-4 border border-blue-500/30 bg-black/60 rounded flex flex-col items-center gap-3 sm:gap-4 mb-4">
                          <p className="text-[10px] sm:text-xs text-blue-400 animate-pulse">{powerupState.active === 'change' ? "SELECT DIGIT TO MUTATE" : "SELECT TWO DIGITS TO SWAP"}</p>
                          <div className="flex gap-2 sm:gap-4">
                            {powerupState.code.split('').map((digit, i) => {
                               if (powerupState.active === 'change' && powerupState.step1Index === i) {
                                 return <input 
                                   key={i} 
                                   autoFocus 
                                   inputMode="numeric"
                                   pattern="[0-9]*"
                                   type="text"
                                   className={cn("w-10 h-10 sm:w-12 sm:h-12 bg-white text-black text-center text-lg sm:text-xl font-bold rounded-sm outline-none border-2 border-blue-500", isRamadan && "font-ramadan")} 
                                   maxLength={1} 
                                   onChange={(e) => { 
                                     const val = e.target.value; 
                                     if (/^\d$/.test(val)) { 
                                       powerupMutation.mutate({ type: 'changeDigit', targetIndex: i, newDigit: val }); 
                                       setPowerupState({ active: null, code: "", step1Index: null }); 
                                     } 
                                   }} 
                                 />;
                               }
                               const isSelected = powerupState.step1Index === i;
                               return <button key={i} className={cn("w-10 h-10 sm:w-12 sm:h-12 bg-black text-center text-lg sm:text-xl font-bold rounded-sm border-2 transition-all outline-none", isSelected ? "border-white text-white scale-110" : "border-primary/50 text-primary/50")} onClick={() => { if (powerupState.active === 'change') setPowerupState(p => ({ ...p, step1Index: i })); else if (powerupState.active === 'swap') { if (powerupState.step1Index === null) setPowerupState(p => ({ ...p, step1Index: i })); else { powerupMutation.mutate({ type: 'swapDigits', swapIndex1: powerupState.step1Index, swapIndex2: i }); setPowerupState({ active: null, code: "", step1Index: null }); } } }}>{digit}</button>;
                            })}
                          </div>
                          <Button variant="ghost" className="text-[10px] sm:text-xs text-red-400" onClick={() => setPowerupState({ active: null, code: "", step1Index: null })}>ABORT</Button>
                        </div>
                     ) : (
                       <div className="relative w-full">
                         {/* SILENCED STATE OVERLAY */}
                         {(myPlayer.silencedTurns || 0) > 0 && (
                           <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded border border-red-500/50 p-2">
                              <Bomb className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-1 animate-pulse" />
                              <p className="text-red-500 font-black tracking-widest text-[10px] sm:text-xs">SYSTEM SILENCED</p>
                              <p className="text-red-400/80 text-[8px] sm:text-[10px]">{myPlayer.silencedTurns} TURNS REMAINING</p>
                           </div>
                         )}

                         <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 mb-4", (myPlayer.silencedTurns || 0) > 0 && "opacity-30 pointer-events-none grayscale")}>
                            {showFirewall && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-yellow-500/50 text-yellow-500 text-[9px] sm:text-[10px] hover:bg-yellow-500/10" disabled={!canUsePowerup || myPlayer.firewallUsed} onClick={() => handlePowerupClick('firewall')}><Shield className="w-3 h-3 mr-1" /> FIREWALL</Button>}
                            {showVirus && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-green-500/50 text-green-500 text-[9px] sm:text-[10px] hover:bg-green-500/10" disabled={!canUsePowerup || myPlayer.virusUsed} onClick={() => handlePowerupClick('virus')}><Bug className="w-3 h-3 mr-1" /> VIRUS</Button>}
                            {showTimer && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-orange-500/50 text-orange-500 text-[9px] sm:text-[10px] hover:bg-orange-500/10" disabled={!canUsePowerup || myPlayer.timeHackUsed} onClick={() => handlePowerupClick('timeHack')}><Timer className="w-3 h-3 mr-1" /> DDOS -20S</Button>}
                            {showBruteforce && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-red-500/50 text-red-500 text-[9px] sm:text-[10px] hover:bg-red-500/10" disabled={!canUsePowerup || myPlayer.bruteforceUsed} onClick={() => handlePowerupClick('bruteforce')}><Zap className="w-3 h-3 mr-1" /> BRUTEFORCE</Button>}
                            {showChangeDigit && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-blue-500/50 text-blue-500 text-[9px] sm:text-[10px] hover:bg-blue-500/10" disabled={!canUsePowerup || myPlayer.changeDigitUsed} onClick={() => setPowerupState({ active: 'change', code: myPlayer.code || '0000', step1Index: null })}><Edit2 className="w-3 h-3 mr-1" /> CHANGE</Button>}
                            {showSwapDigits && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-purple-500/50 text-purple-500 text-[9px] sm:text-[10px] hover:bg-purple-500/10" disabled={!canUsePowerup || myPlayer.swapDigitsUsed} onClick={() => setPowerupState({ active: 'swap', code: myPlayer.code || '0000', step1Index: null })}><Shuffle className="w-3 h-3 mr-1" /> SWAP</Button>}
                            {showEmp && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-cyan-500/50 text-cyan-500 text-[9px] sm:text-[10px] hover:bg-cyan-500/10" disabled={!canUsePowerup || myPlayer.empUsed} onClick={() => handlePowerupClick('emp')}><Radio className="w-3 h-3 mr-1" /> EMP</Button>}
                            {showSpyware && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-emerald-500/50 text-emerald-500 text-[9px] sm:text-[10px] hover:bg-emerald-500/10" disabled={!canUsePowerup || myPlayer.spywareUsed} onClick={() => handlePowerupClick('spyware')}><Eye className="w-3 h-3 mr-1" /> SPYWARE</Button>}
                            {showHoneypot && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-indigo-500/50 text-indigo-500 text-[9px] sm:text-[10px] hover:bg-indigo-500/10" disabled={!canUsePowerup || myPlayer.honeypotUsed} onClick={() => handlePowerupClick('honeypot')}><Ghost className="w-3 h-3 mr-1" /> HONEYPOT</Button>}
                            {showLogicBomb && <Button variant="outline" className="w-full h-8 sm:h-10 px-1 border-zinc-500/50 text-zinc-400 text-[9px] sm:text-[10px] hover:bg-zinc-500/10" disabled={!canUsePowerup || myPlayer.logicBombUsed} onClick={() => handlePowerupClick('logicBomb')}><Bomb className="w-3 h-3 mr-1" /> LOGIC BOMB</Button>}
                         </div>
                       </div>
                     )}

                     <div className={cn("p-3 sm:p-4 border bg-black/60 rounded flex flex-col lg:flex-row items-center gap-3 sm:gap-4 mt-2", primaryBorder)}>
                        <div className="flex-1 w-full text-center lg:text-left">
                          <p className={cn("text-[9px] sm:text-[10px] tracking-widest mb-1 sm:mb-2", isRamadan ? "text-purple-400/50" : "text-fuchsia-500/50")}>TARGET: {selectedTarget ? <span style={{ color: opponents.find((o:any)=>o.id===selectedTarget)?.playerColor || (isRamadan ? '#c084fc' : '#E879F9')}}>{opponents.find((o:any)=>o.id===selectedTarget)?.playerName}</span> : "NONE"}</p>
                          <UnifiedCyberInput value={guessDigits.join('')} onChange={(val: string) => setGuessDigits(val.split(''))} disabled={!isMyTurn || myPlayer.isEliminated || myPlayer.isGhost || !selectedTarget} colorTheme="fuchsia" isRamadan={isRamadan} />
                        </div>
                        
                        <div className="w-full lg:w-auto mt-2 lg:mt-0">
                          {isBrokenTurn ? (
                             <Button 
                               className="w-full h-12 md:h-16 px-4 sm:px-8 font-black tracking-widest text-sm sm:text-lg border-2 bg-yellow-500/20 text-yellow-500 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:bg-yellow-500 hover:text-black animate-pulse" 
                               onClick={() => skipMutation.mutate()}
                               disabled={skipMutation.isPending}
                             >
                               {skipMutation.isPending ? "SKIPPING..." : "SKIP TURN >>"}
                             </Button>
                          ) : (
                             <Button 
                               className={cn("w-full h-12 md:h-16 px-4 sm:px-8 font-black tracking-widest text-sm sm:text-lg border-2", selectedTarget && isGuessReady ? "bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-500 hover:text-black" : (isRamadan ? "bg-transparent text-purple-400/30 border-purple-500/20" : "bg-transparent text-fuchsia-500/30 border-fuchsia-500/20"))} 
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
                          <p className="text-[10px] sm:text-xs text-purple-400">GHOST PROTOCOL ACTIVATED</p>
                          <p className="text-[8px] sm:text-[10px] text-purple-300/70 mt-1">You have <span className="text-white font-bold text-[10px] sm:text-sm">{ghostStrikesLeft}</span> strikes left to take revenge. Choose wisely!</p>
                      </div>
                  ) : (
                      <p className="text-[10px] sm:text-xs text-red-400/70 mt-1">SPECTATOR MODE</p>
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
                  <span className="text-[9px] sm:text-[10px] text-yellow-500 mb-1">SCORE: {myPlayer.points || 0} / {gameData.targetPoints}</span>
                  <div className="w-full h-1.5 sm:h-2 bg-black rounded overflow-hidden border border-yellow-500/30"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${Math.min(100, ((myPlayer.points || 0) / gameData.targetPoints) * 100)}%` }} /></div>
               </div>
             )}

             <div className={cn("flex flex-col border bg-black/20 rounded overflow-hidden", primaryBorder)}>
               <div className={cn("p-2 border-b flex items-center gap-2", primaryBg, primaryBorder)}>
                 <Terminal className={cn("w-3 h-3 sm:w-4 sm:h-4", primaryColor)} /><span className={cn("text-[9px] sm:text-[10px] tracking-widest uppercase", primaryColor)}>Global System Logs</span>
               </div>
               <TerminalLog logs={gameData.logs || []} players={gameData.players} isRamadan={isRamadan} />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
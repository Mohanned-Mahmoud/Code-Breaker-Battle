import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Share2, Terminal, Crosshair, Skull, Users, Activity, Shield, Bug, Zap, Edit2, Shuffle, Radio, Eye, Timer, Ghost, Bomb, Anchor, CheckCircle2, Lock, RefreshCw, Send, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

const ALL_POWERUPS = [
  { id: 'firewall', label: 'FIREWALL', icon: Shield, color: 'text-yellow-500', border: 'border-yellow-500/50', hover: 'hover:bg-yellow-500/10', usedProp: 'firewallUsed' },
  { id: 'timeHack', label: 'DDOS', icon: Timer, color: 'text-orange-500', border: 'border-orange-500/50', hover: 'hover:bg-orange-500/10', usedProp: 'timeHackUsed' },
  { id: 'virus', label: 'VIRUS', icon: Bug, color: 'text-green-500', border: 'border-green-500/50', hover: 'hover:bg-green-500/10', usedProp: 'virusUsed' },
  { id: 'bruteforce', label: 'BRUTEFORCE', icon: Zap, color: 'text-red-500', border: 'border-red-500/50', hover: 'hover:bg-red-500/10', usedProp: 'bruteforceUsed' },
  { id: 'changeDigit', label: 'CHANGE', icon: Edit2, color: 'text-blue-500', border: 'border-blue-500/50', hover: 'hover:bg-blue-500/10', usedProp: 'changeDigitUsed' },
  { id: 'swapDigits', label: 'SWAP', icon: Shuffle, color: 'text-purple-500', border: 'border-purple-500/50', hover: 'hover:bg-purple-500/10', usedProp: 'swapDigitsUsed' },
  { id: 'emp', label: 'EMP', icon: Radio, color: 'text-cyan-500', border: 'border-cyan-500/50', hover: 'hover:bg-cyan-500/10', usedProp: 'empUsed' },
  { id: 'spyware', label: 'SPYWARE', icon: Eye, color: 'text-emerald-500', border: 'border-emerald-500/50', hover: 'hover:bg-emerald-500/10', usedProp: 'spywareUsed' },
  { id: 'honeypot', label: 'HONEYPOT', icon: Ghost, color: 'text-indigo-400', border: 'border-indigo-400/50', hover: 'hover:bg-indigo-400/10', usedProp: 'honeypotUsed' },
  { id: 'logicBomb', label: 'LOGIC BOMB', icon: Bomb, color: 'text-zinc-400', border: 'border-zinc-500/50', hover: 'hover:bg-zinc-500/10', usedProp: 'logicBombUsed' },
  { id: 'phishing', label: 'PHISHING', icon: Anchor, color: 'text-pink-400', border: 'border-pink-400/50', hover: 'hover:bg-pink-400/10', usedProp: 'phishingUsed' }
];

function UnifiedCyberInput({ value, onChange, disabled, colorTheme = "cyan", isRamadan = false, length = 6 }: { value: string, onChange: (val: string) => void, disabled?: boolean, colorTheme?: "cyan" | "blue" | "red", isRamadan?: boolean, length?: number }) {
  const paddedValue = value.padEnd(length, ' ');
  const chars = paddedValue.split('');
  const digits = chars.slice(0, length);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeColor = isRamadan ? "blue" : colorTheme;
  const themeBorder = activeColor === "red" ? "border-red-500" : activeColor === "blue" ? "border-blue-500" : "border-cyan-500";
  const themeText = activeColor === "red" ? "text-red-500" : activeColor === "blue" ? "text-blue-400" : "text-cyan-500";

  return (
    <div className="flex gap-1.5 sm:gap-3 justify-center">
      {digits.map((digit, i) => {
         if (activeIndex === i && !disabled) {
           return (
             <input key={i} autoFocus inputMode="numeric" pattern="[0-9]*" type="text"
               className={cn("w-8 h-10 sm:w-12 sm:h-12 md:w-14 md:h-16 bg-white text-black text-center text-xl sm:text-2xl font-bold rounded-sm outline-none border-2", themeBorder, isRamadan && "font-ramadan")} 
               maxLength={1} 
               onChange={(e) => { 
                 const val = e.target.value; 
                 if (/^\d$/.test(val)) { 
                    const newArr = [...digits]; newArr[i] = val; onChange(newArr.join(''));
                    if (i < length - 1) setActiveIndex(i + 1); else setActiveIndex(null);
                 } 
               }}
               onKeyDown={(e) => {
                 if (e.key === 'Backspace') {
                    const newArr = [...digits]; newArr[i] = ' '; onChange(newArr.join(''));
                    if (i > 0) setActiveIndex(i - 1);
                 }
               }}
               onBlur={() => setActiveIndex(null)}
             />
           );
         }
         return (
           <button key={i} disabled={disabled}
             className={cn("w-8 h-10 sm:w-12 sm:h-12 md:w-14 md:h-16 bg-black text-center text-xl sm:text-2xl font-bold rounded-sm border-2 transition-all outline-none", disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105", activeIndex === i ? "border-white text-white scale-110" : cn("border-current/50", themeText), isRamadan && "font-ramadan")} 
             onClick={() => setActiveIndex(i)}
           >
             {digit.trim() === '' ? "?" : digit}
           </button>
         );
      })}
    </div>
  );
}

function TerminalLog({ logs, isRamadan, chatMode = false }: { logs: any[], isRamadan: boolean, chatMode?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs]);

  return (
    <div ref={scrollRef} className={cn("text-[10px] sm:text-xs w-full h-[200px] md:h-[250px] overflow-y-auto p-3 sm:p-4 bg-black/60 border rounded-sm custom-scrollbar relative", isRamadan ? "font-ramadan border-blue-500/20" : "font-mono border-cyan-500/20")}>
      <div className="flex flex-col-reverse space-y-reverse space-y-2">
        <AnimatePresence initial={false}>
          {logs.slice().reverse().map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={cn("flex-1 break-words font-medium", chatMode ? "text-green-400" : (log.type === 'success' ? 'text-green-500' : log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : (isRamadan ? 'text-blue-400/70' : 'text-cyan-500/70')))}>
                {">"} {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TeamRoom() {
  const [, params] = useRoute("/team/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isRamadan = theme === "ramadan";
  
  const roomId = params?.id || "ERROR";
  const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"]; 
  const fontClass = isRamadan ? "font-ramadan" : "font-mono";
  const primaryColor = isRamadan ? "text-blue-400" : "text-cyan-500";
  const primaryBorder = isRamadan ? "border-blue-500/30" : "border-cyan-500/30";
  const primaryBg = isRamadan ? "bg-blue-500/10" : "bg-cyan-500/10";

  // States
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "");
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('preferred_hacker_color') || COLORS[0]);
  
  const [setupDigits, setSetupDigits] = useState(['', '', '']); 
  const [selectedPowerups, setSelectedPowerups] = useState<string[]>([]); // اللود-أوت
  const [isSynced, setIsSynced] = useState(false);
  
  const [guessDigits, setGuessDigits] = useState(['', '', '', '', '', '']); 
  const [powerupState, setPowerupState] = useState<{ active: 'change' | 'swap' | null; code: string; step1Index: number | null; }>({ active: null, code: "", step1Index: null });
  
  const [chatTab, setChatTab] = useState<'global' | 'team'>('global');
  const [chatMsg, setChatMsg] = useState("");
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);

  const [myPlayerId, setMyPlayerId] = useState<number | null>(() => {
    const saved = localStorage.getItem(`team_player_${roomId}`);
    return saved ? parseInt(saved) : null;
  });

  const { data: gameData, isLoading, error } = useQuery<any>({
    queryKey: ['teamGame', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/team/${roomId}`);
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

  // --- MUTATIONS ---
  const joinMutation = useMutation({
    mutationFn: async (team: 'A'|'B') => {
      if (!playerName.trim()) throw new Error("Enter your alias first!");
      const res = await fetch('/api/team/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: gameData?.roomId, playerName, playerColor, team }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => { 
      setMyPlayerId(data.playerId); localStorage.setItem(`team_player_${roomId}`, data.playerId.toString()); localStorage.setItem('playerName', playerName);
      queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] }); 
    }
  });

  const lockMutation = useMutation({
    mutationFn: async (args: { codeStr: string, powerups: string[] }) => fetch(`/api/team/${gameData.id}/lock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId, partialCode: args.codeStr, powerups: args.powerups }) }).then(r=>r.json()),
    onSuccess: () => { toast({ title: "LOCKED", description: "Your loadout is secured." }); queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] }); },
    onError: (err: any) => toast({ title: "CONFLICT", description: err.message, variant: "destructive" })
  });

  const readyMutation = useMutation({
    mutationFn: async () => fetch(`/api/team/${gameData.id}/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) }).then(r=>r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] })
  });

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => fetch(`/api/team/${gameData.id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId, message: msg }) }).then(r=>r.json()),
    onSuccess: () => { setChatMsg(""); queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] }); }
  });

  const guessMutation = useMutation({
    mutationFn: async (guess: string) => {
      const res = await fetch(`/api/team/${gameData.id}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attackerId: myPlayerId, guess }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Attack Failed");
      return data;
    },
    onSuccess: () => { setGuessDigits(['', '', '', '', '', '']); queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] }); },
    onError: (err: any) => toast({ title: "HACK FAILED", description: err.message, variant: "destructive" })
  });

  const powerupMutation = useMutation({
    mutationFn: async (args: any) => {
      const res = await fetch(`/api/team/${gameData.id}/powerup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attackerId: myPlayerId, ...args }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Powerup Failed");
      return data;
    },
    onSuccess: () => { 
      toast({ title: "SYSTEM UPDATE", description: "Powerup Activated" }); 
      setPowerupState({ active: null, code: "", step1Index: null }); 
      queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] }); 
    },
    onError: (err: any) => toast({ title: "ERROR", description: err.message, variant: "destructive" })
  });

  const handlePowerupClick = (type: string) => powerupMutation.mutate({ type });

  // Game Logic
  const players = gameData?.players || [];
  const teamA = players.filter((p:any) => p.team === 'A');
  const teamB = players.filter((p:any) => p.team === 'B');
  const myPlayer = players.find((p: any) => p.id === myPlayerId);
  const myTeam = myPlayer?.team;
  const partner = players.find((p:any) => p.team === myTeam && p.id !== myPlayerId);
  
  const cleanSetupStr = setupDigits.join('').replace(/ /g, '');
  const isSetupReady = cleanSetupStr.length === 3 && selectedPowerups.length === 4;
  
  const cleanGuessStr = guessDigits.join('').replace(/ /g, '');
  const isGuessReady = cleanGuessStr.length === 6;

  const isMyTeamTurn = gameData?.status === 'playing' && gameData?.turnTeam === myTeam;
  const activeOperatorId = myTeam === 'A' ? gameData?.activePlayerIdA : gameData?.activePlayerIdB;
  const isActiveOperator = isMyTeamTurn && activeOperatorId === myPlayerId;
  const myTeamCode = myTeam === 'A' ? gameData?.teamACode : gameData?.teamBCode;

  const globalLogs = gameData?.logs?.filter((l:any) => !l.type.startsWith('chat_')) || [];
  const teamLogs = gameData?.logs?.filter((l:any) => l.type === `chat_${myTeam}`) || [];

  useEffect(() => {
    if (chatTab === 'team') { setHasUnreadChat(false); setLastSeenChatCount(teamLogs.length); }
    else if (teamLogs.length > lastSeenChatCount) { setHasUnreadChat(true); }
  }, [teamLogs.length, chatTab, lastSeenChatCount]);

  const handleSync = () => {
    queryClient.invalidateQueries({ queryKey: ['teamGame', roomId] });
    if (partner?.partialCode) { setIsSynced(true); toast({ title: "SYNC SUCCESSFUL", description: "Partner's loadout revealed." }); } 
    else { toast({ title: "SYNC FAILED", description: "Partner hasn't locked yet.", variant: "destructive" }); }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/team/${roomId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "LINK COPIED!", description: "Invite link copied to clipboard." });
  };

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="animate-spin w-10 h-10 text-cyan-500" /></div>;
  if (error || !gameData) return <div className="h-[100dvh] flex items-center justify-center text-red-500">ROOM OFFLINE</div>;

  // ==========================================
  // PHASE 1: LOBBY
  // ==========================================
  if (!myPlayerId || !myPlayer) {
    return (
      <div className={cn("min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-x-hidden", fontClass)}>
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 relative z-10">
          
          <div className="order-2 lg:order-1 col-span-1 flex flex-col gap-4">
            <div className={cn("p-3 border-b-2 text-center font-black tracking-widest text-lg bg-black/50 backdrop-blur", isRamadan ? "border-blue-500 text-blue-500" : "border-cyan-500 text-cyan-500")}>TEAM A</div>
            {[0, 1].map((index) => {
              const p = teamA[index];
              return (
                <div key={index} className={cn("h-32 border rounded-xl flex flex-col items-center justify-center transition-all relative", primaryBorder, primaryBg, !p && "hover:bg-white/10 cursor-pointer")} onClick={() => !p && joinMutation.mutate('A')}>
                  <div className="absolute top-2 left-3 text-[9px] opacity-40 font-bold tracking-widest">{index === 0 ? "1ST HALF [1-3]" : "2ND HALF [4-6]"}</div>
                  {p ? <><Shield className="w-8 h-8 mb-2" style={{ color: p.playerColor }} /><span className="font-bold" style={{ color: p.playerColor }}>{p.playerName}</span></> : <span className="text-xs opacity-50">[ CLICK TO JOIN A ]</span>}
                </div>
              );
            })}
          </div>

          <div className="order-1 lg:order-2 col-span-1 lg:col-span-2 grid grid-cols-2 gap-4">
            <div className={cn("col-span-2 p-6 border rounded-xl flex flex-col items-center justify-center text-center bg-black/60", primaryBorder)}>
              <div className="text-[10px] opacity-50 tracking-widest mb-2">IDENTIFICATION</div>
              <input type="text" placeholder="ENTER ALIAS..." value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} maxLength={10} className={cn("w-full max-w-xs bg-black/80 border px-4 py-3 text-center tracking-widest focus:outline-none uppercase rounded-lg mb-4", theme === 'ramadan' ? "border-blue-500/50 text-blue-400" : "border-cyan-500/50 text-cyan-500")} />
            </div>
            <div className={cn("p-6 border rounded-xl flex flex-col items-center justify-center text-center", primaryBg, primaryBorder)}>
              <Terminal className="w-6 h-6 mb-2 opacity-50" />
              <div className="text-[10px] opacity-50 tracking-widest mb-1">ROOM ID</div>
              <div className="text-2xl lg:text-3xl font-black tracking-widest mb-3">{roomId}</div>
              <Button variant="outline" size="sm" onClick={copyInviteLink} className={cn("h-8 text-[10px] tracking-widest bg-black/50 hover:bg-current/10 w-full max-w-[150px]", primaryColor, primaryBorder)}>
                <Share2 className="w-3 h-3 mr-2" /> COPY INVITE
              </Button>
            </div>
            <div className={cn("p-6 border rounded-xl flex flex-col items-center justify-center text-center", primaryBg, primaryBorder)}>
              <Users className="w-6 h-6 mb-2 opacity-50" />
              <div className="text-[10px] opacity-50 tracking-widest">OPERATORS</div>
              <div className="text-2xl lg:text-3xl font-black mt-2">{players.length} / 4</div>
            </div>
          </div>

          <div className="order-3 lg:order-3 col-span-1 flex flex-col gap-4">
            <div className={cn("p-3 border-b-2 text-center font-black tracking-widest text-lg bg-black/50 backdrop-blur", isRamadan ? "border-blue-500 text-blue-500" : "border-red-500 text-red-500")}>TEAM B</div>
            {[0, 1].map((index) => {
              const p = teamB[index];
              return (
                <div key={index} className={cn("h-32 border rounded-xl flex flex-col items-center justify-center transition-all relative", primaryBorder, primaryBg, !p && "hover:bg-white/10 cursor-pointer")} onClick={() => !p && joinMutation.mutate('B')}>
                  <div className="absolute top-2 left-3 text-[9px] opacity-40 font-bold tracking-widest">{index === 0 ? "1ST HALF [1-3]" : "2ND HALF [4-6]"}</div>
                  {p ? <><Crosshair className="w-8 h-8 mb-2" style={{ color: p.playerColor }} /><span className="font-bold" style={{ color: p.playerColor }}>{p.playerName}</span></> : <span className="text-xs opacity-50">[ CLICK TO JOIN B ]</span>}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // PHASE 2: SETUP (Set Code & Powerups)
  // ==========================================
  if (gameData.status === 'waiting' && myPlayer) {
    const myTeamArray = myTeam === 'A' ? teamA : teamB;
    const amIFirst = myTeamArray[0]?.id === myPlayerId; 

    const partnerPowerups = partner?.equippedPowerups ? JSON.parse(partner.equippedPowerups) : [];

    const MyInputCard = (
      <div className="flex flex-col items-center p-6 border border-current/20 rounded-xl bg-black/40 w-full relative">
        <div className="absolute top-3 left-3 text-[9px] opacity-40 font-bold">{amIFirst ? "DIGITS 1-3" : "DIGITS 4-6"}</div>
        <span className={cn("text-[10px] tracking-widest mb-4 uppercase mt-2", primaryColor)}>YOUR 3 DIGITS</span>
        <UnifiedCyberInput length={3} value={setupDigits.join('')} onChange={(val: string) => setSetupDigits(val.split(''))} disabled={!!myPlayer.partialCode || lockMutation.isPending} isRamadan={isRamadan} colorTheme="cyan" />
      </div>
    );

    const PartnerInputCard = (
      <div className="flex flex-col items-center p-6 border border-current/20 rounded-xl bg-black/40 w-full relative">
        <div className="absolute top-3 left-3 text-[9px] opacity-40 font-bold">{amIFirst ? "DIGITS 4-6" : "DIGITS 1-3"}</div>
        <span className="text-[10px] tracking-widest opacity-50 mb-4 uppercase mt-2">PARTNER: {partner?.playerName || "WAITING"}</span>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-current/20 rounded-sm flex items-center justify-center text-xl font-bold opacity-50">
              {partner?.partialCode ? (isSynced ? partner.partialCode[i] : "*") : "?"}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className={cn("min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative", fontClass)}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto w-full relative z-10">
          <div className={cn("p-6 md:p-8 border rounded-2xl flex flex-col items-center space-y-6 backdrop-blur-md bg-black/60", primaryBorder)}>
            
            <div className="text-center space-y-2">
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-[0.2em] uppercase", primaryColor)}>TACTICAL SETUP</h1>
              <p className="text-[10px] md:text-xs opacity-60">Set your code fragment and draw your 4 unique abilities.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
               {amIFirst ? <>{MyInputCard}{PartnerInputCard}</> : <>{PartnerInputCard}{MyInputCard}</>}
            </div>

            {/* ABILITIES SELECTION */}
            <div className="w-full flex flex-col items-center pt-4 border-t border-current/20">
               <span className={cn("text-[10px] tracking-widest mb-4 uppercase", selectedPowerups.length === 4 ? "text-green-500" : primaryColor)}>
                  SELECT 4 ABILITIES ({selectedPowerups.length}/4)
               </span>
               <div className="flex flex-wrap justify-center gap-2 w-full">
                 {ALL_POWERUPS.map(pw => {
                    const isPartnerLocked = partnerPowerups.includes(pw.id);
                    const isSelected = selectedPowerups.includes(pw.id);
                    const Icon = pw.icon;
                    return (
                      <button
                        key={pw.id}
                        disabled={isPartnerLocked || !!myPlayer.partialCode}
                        onClick={() => {
                           if (isSelected) setSelectedPowerups(prev => prev.filter(p => p !== pw.id));
                           else if (selectedPowerups.length < 4) setSelectedPowerups(prev => [...prev, pw.id]);
                        }}
                        className={cn("w-[90px] h-[70px] border rounded flex flex-col items-center justify-center transition-all relative overflow-hidden", isSelected ? "bg-white text-black border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : isPartnerLocked ? "opacity-20 cursor-not-allowed border-red-500/30 text-red-500" : cn("bg-black/40 hover:scale-105", pw.border, pw.color, pw.hover))}
                      >
                        <Icon className="w-5 h-5 mb-1" />
                        <span className="text-[8px] tracking-widest font-bold text-center leading-tight">{pw.label.split(' ').map((w,i)=><span key={i}>{w}<br/></span>)}</span>
                        {isPartnerLocked && <span className="absolute text-[6px] text-red-500 font-bold bg-black px-1 rounded-sm bottom-1 border border-red-500">TAKEN</span>}
                      </button>
                    )
                 })}
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
              <Button onClick={handleSync} variant="outline" className={cn("flex-1 h-14 tracking-widest hover:bg-current/10", primaryColor, primaryBorder)}>
                <RefreshCw className="w-4 h-4 mr-2" /> SYNC
              </Button>
              <Button onClick={() => lockMutation.mutate({ codeStr: cleanSetupStr, powerups: selectedPowerups })} disabled={!!myPlayer.partialCode || !isSetupReady || lockMutation.isPending} className={cn("flex-1 h-14 tracking-widest font-black text-black", myPlayer.partialCode ? "bg-yellow-500 hover:bg-yellow-500" : (isRamadan ? "bg-blue-500 hover:bg-blue-400" : "bg-cyan-500 hover:bg-cyan-400"))}>
                {myPlayer.partialCode ? <><Lock className="w-5 h-5 mr-2" /> LOCKED</> : "LOCK LOADOUT"}
              </Button>
              <Button onClick={() => readyMutation.mutate()} disabled={!myPlayer.partialCode || myPlayer.isSetup || readyMutation.isPending} className={cn("flex-1 h-14 tracking-widest font-black text-black", myPlayer.isSetup ? "bg-green-500 hover:bg-green-500" : "bg-white hover:bg-gray-200")}>
                {myPlayer.isSetup ? <><CheckCircle2 className="w-5 h-5 mr-2" /> READY</> : "READY TO PLAY"}
              </Button>
            </div>
            
            <p className="text-[10px] tracking-widest opacity-50 text-center uppercase">
              {players.filter((p:any)=>p.isSetup).length} / 4 OPERATORS READY
            </p>

          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // PHASE 3: ACTIVE BATTLE
  // ==========================================
  if (gameData.status === 'finished') {
    const isWinner = gameData.winnerTeam === myTeam;
    return (
      <div className={cn("h-[100dvh] flex flex-col items-center justify-center p-4 text-center space-y-6 bg-background", fontClass)}>
        <Crown className={cn("w-20 h-20 animate-bounce", isWinner ? "text-yellow-500" : "text-red-500")} />
        <h1 className={cn("text-4xl sm:text-6xl font-black glitch-effect uppercase", isWinner ? "text-yellow-500" : "text-red-500")}>
           {isWinner ? "MISSION ACCOMPLISHED" : "SYSTEM COMPROMISED"}
        </h1>
        <p className="text-xl opacity-70">TEAM {gameData.winnerTeam} WINS THE BATTLE</p>
        <Button variant="outline" className="mt-8 border-current hover:bg-current/10" onClick={() => setLocation('/')}>RETURN TO BASE</Button>
      </div>
    );
  }

  // 🔴 التعديل هنا: قراءة اللود أوت بتاعك إنت، مش بتاع اللاعب اللي عليه الدور
  const myPowerupsList = myPlayer?.equippedPowerups ? JSON.parse(myPlayer.equippedPowerups) : [];

  return (
    <div className={cn("h-[100dvh] w-full bg-background overflow-y-auto overflow-x-hidden custom-scrollbar relative p-2 md:p-4", fontClass)}>
      <div className="flex flex-col gap-3 md:gap-4 max-w-[1600px] mx-auto w-full relative z-10 pb-10">
        
        {/* Top Header */}
        <div className={cn("flex justify-between items-center border bg-black/40 p-3 rounded", primaryBorder)}>
           <div className="text-left flex flex-col">
              <span className={cn("text-[10px] tracking-widest block mb-1", isRamadan ? "text-blue-400/50" : "text-cyan-500/50")}>TEAM A</span>
              <span className="font-black text-sm sm:text-lg">{teamA.map((p:any)=>p.playerName).join(" & ")}</span>
           </div>
           <div className="text-center flex flex-col items-center">
              {gameData.customTimer && (
                <div className={cn("text-xl sm:text-3xl font-black tracking-widest transition-colors", (gameData.timeLeft ?? 30) <= 10 ? "text-red-500 animate-pulse" : primaryColor)}>
                   00:{String(gameData.timeLeft ?? 0).padStart(2, '0')}
                </div>
              )}
              {isMyTeamTurn ? (
                  isActiveOperator ? (
                    <div className={cn("px-4 py-1 text-black font-black tracking-widest rounded animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)] text-[10px] sm:text-sm mt-1", isRamadan ? "bg-blue-500" : "bg-cyan-500")}>YOUR TURN TO EXECUTE</div>
                  ) : (
                    <div className={cn("px-4 py-1 border text-yellow-500 border-yellow-500 font-black tracking-widest rounded shadow-[0_0_15px_rgba(234,179,8,0.2)] text-[10px] sm:text-sm mt-1")}>PARTNER IS EXECUTING</div>
                  )
              ) : (
                  <div className={cn("px-4 py-1 border tracking-widest rounded text-[9px] sm:text-xs flex items-center gap-2 mt-1 opacity-50", primaryBorder, primaryColor)}><Activity className="w-3 h-3 animate-spin" /> ENEMY TURN</div>
              )}
           </div>
           <div className="text-right flex flex-col">
              <span className={cn("text-[10px] tracking-widest block mb-1", isRamadan ? "text-blue-400/50" : "text-cyan-500/50")}>TEAM B</span>
              <span className="font-black text-sm sm:text-lg">{teamB.map((p:any)=>p.playerName).join(" & ")}</span>
           </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Main Play Area */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
             {/* Target Detected */}
             <div className={cn("border bg-black/20 p-4 rounded", primaryBorder)}>
               <h3 className={cn("text-xs tracking-widest mb-4 flex items-center gap-2 opacity-70", primaryColor)}><Crosshair className="w-4 h-4"/> ENEMY TARGET DETECTED</h3>
               <div className={cn("p-4 border rounded flex items-center gap-3", isRamadan ? "border-blue-500/50 bg-blue-500/10" : "border-cyan-500/50 bg-cyan-500/10")}>
                  <Shield className="w-6 h-6 text-red-500" />
                  <span className="font-bold tracking-widest text-red-500">TEAM {myTeam === 'A' ? 'B' : 'A'} MASTER CODE</span>
               </div>
             </div>

             {/* 🔴 Dynamic Powerups Rendering based on MY Loadout */}
             <div className={cn("p-4 border rounded relative overflow-hidden", primaryBorder, primaryBg)}>
                
                {/* 🔴 Logic Bomb Warning Screen */}
                {(myPlayer.silencedTurns || 0) > 0 && (
                   <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center animate-pulse text-black">
                         <Bomb className="w-8 h-8 mb-2" />
                         <span className="font-black tracking-widest text-lg">SILENCED ({myPlayer.silencedTurns} TURNS)</span>
                         <span className="text-[10px] tracking-widest opacity-80 mt-1">ABILITIES JAMMED</span>
                      </div>
                   </div>
                )}

                <span className={cn("text-[10px] tracking-widest opacity-50 block mb-3 uppercase", primaryColor)}>
                   YOUR ARSENAL LOADOUT
                </span>
                
                <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2", (!isActiveOperator || (myPlayer.silencedTurns || 0) > 0) && "opacity-30 pointer-events-none grayscale")}>
                    {ALL_POWERUPS.filter(pw => myPowerupsList.includes(pw.id)).map(pw => {
                        const Icon = pw.icon;
                        const isUsed = myPlayer ? myPlayer[pw.usedProp as keyof typeof myPlayer] : false;
                        
                        return (
                           <Button 
                             key={pw.id} 
                             variant="outline" 
                             className={cn("w-full h-10 px-1 text-[9px] sm:text-[10px]", pw.border, pw.color, pw.hover)} 
                             onClick={() => {
                                if (pw.id === 'changeDigit') setPowerupState({ active: 'change', code: myTeamCode || '000000', step1Index: null });
                                else if (pw.id === 'swapDigits') setPowerupState({ active: 'swap', code: myTeamCode || '000000', step1Index: null });
                                else handlePowerupClick(pw.id);
                             }} 
                             disabled={!isActiveOperator || !!isUsed || (myPlayer.silencedTurns || 0) > 0}
                           >
                              <Icon className="w-3 h-3 mr-1" /> {pw.label}
                           </Button>
                        );
                    })}
                </div>

                {/* Interactive Powerup Display (Change / Swap on OWN code without Prompts) */}
                {powerupState.active && (
                   <div className="p-3 mt-3 border border-blue-500/30 bg-black/60 rounded flex flex-col items-center gap-3 relative z-10">
                     <p className="text-[10px] text-blue-400 animate-pulse">
                        {powerupState.active === 'change' 
                          ? (powerupState.step1Index === null ? "SELECT YOUR DIGIT TO MUTATE" : "ENTER NEW DIGIT VALUE") 
                          : "SELECT TWO OF YOUR DIGITS TO SWAP"}
                     </p>
                     
                     {powerupState.active === 'change' && powerupState.step1Index !== null ? (
                         <input 
                            type="text" 
                            autoFocus
                            maxLength={1} 
                            className={cn("w-12 h-14 bg-black border-2 text-center text-2xl font-bold rounded-sm outline-none", isRamadan ? "border-blue-500 text-blue-500" : "border-cyan-500 text-cyan-500")}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d$/.test(val)) {
                                    powerupMutation.mutate({ type: 'changeDigit', targetIndex: powerupState.step1Index, newDigit: val });
                                    setPowerupState({ active: null, code: "", step1Index: null });
                                } else {
                                    e.target.value = '';
                                }
                            }}
                         />
                     ) : (
                         <div className="flex gap-2">
                            {powerupState.code.split('').map((digit, i) => (
                               <button key={i} className={cn("w-8 h-10 bg-black text-center text-lg font-bold rounded-sm border-2 transition-all", powerupState.step1Index === i ? "border-white text-white" : "border-blue-500/50 text-blue-500")}
                                onClick={() => {
                                   if (powerupState.active === 'change') {
                                       setPowerupState(p => ({ ...p, step1Index: i }));
                                   } else if (powerupState.active === 'swap') {
                                       if (powerupState.step1Index === null) setPowerupState(p => ({ ...p, step1Index: i }));
                                       else {
                                           powerupMutation.mutate({ type: 'swapDigits', swapIndex1: powerupState.step1Index, swapIndex2: i });
                                           setPowerupState({ active: null, code: "", step1Index: null });
                                       }
                                   }
                                }}
                               >{digit}</button>
                            ))}
                         </div>
                     )}
                     <Button variant="ghost" className="text-[10px] text-red-400" onClick={() => setPowerupState({ active: null, code: "", step1Index: null })}>ABORT</Button>
                   </div>
                )}
             </div>

             {/* Hacking Panel */}
             <div className={cn("p-4 sm:p-6 border bg-black/60 rounded flex flex-col items-center gap-4", primaryBorder)}>
                <span className={cn("text-[10px] tracking-widest opacity-50", primaryColor)}>DECRYPT 6-DIGIT MASTER CODE</span>
                <UnifiedCyberInput length={6} value={guessDigits.join('')} onChange={(val: string) => setGuessDigits(val.split(''))} disabled={!isActiveOperator || guessMutation.isPending} isRamadan={isRamadan} colorTheme="cyan" />
                <Button 
                   className={cn("w-full max-w-sm h-14 mt-4 font-black tracking-widest text-lg", isRamadan ? "bg-blue-500 text-black hover:bg-blue-400" : "bg-cyan-500 text-black hover:bg-cyan-400")} 
                   disabled={!isActiveOperator || !isGuessReady || guessMutation.isPending}
                   onClick={() => guessMutation.mutate(cleanGuessStr)}
                >
                   {guessMutation.isPending ? "HACKING..." : "EXECUTE HACK"}
                </Button>
             </div>
          </div>

          {/* Right Column: Logs & Team Chat */}
          <div className="flex flex-col gap-4 h-full">
             <div className={cn("flex flex-col border bg-black/20 rounded h-full min-h-[400px]", primaryBorder)}>
               {/* TABS WITH NOTIFICATION BADGE */}
               <div className="flex border-b border-current/20">
                  <button onClick={() => setChatTab('global')} className={cn("flex-1 p-3 text-[10px] font-bold tracking-widest uppercase transition-all", chatTab === 'global' ? cn(primaryBg, primaryColor) : "opacity-50 hover:opacity-100")}>
                    SYSTEM LOGS
                  </button>
                  <button onClick={() => setChatTab('team')} className={cn("relative flex-1 p-3 text-[10px] font-bold tracking-widest uppercase transition-all border-l border-current/20", chatTab === 'team' ? "bg-green-500/10 text-green-400" : "opacity-50 hover:opacity-100")}>
                    TEAM CHAT
                    {hasUnreadChat && (
                      <span className="absolute top-2 right-2 sm:right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
                    )}
                  </button>
               </div>
               
               {/* LOGS / CHAT DISPLAY */}
               <div className="flex-1 flex flex-col">
                  {chatTab === 'global' ? (
                     <TerminalLog logs={globalLogs} isRamadan={isRamadan} />
                  ) : (
                     <>
                       <TerminalLog logs={teamLogs} isRamadan={isRamadan} chatMode={true} />
                       {/* CHAT INPUT */}
                       <div className="p-3 border-t border-current/20 flex gap-2 bg-black/50">
                          <input 
                            type="text" 
                            placeholder={(myPlayer.silencedTurns || 0) > 0 ? "COMMUNICATIONS JAMMED" : "Message team..."} 
                            value={chatMsg}
                            onChange={(e) => setChatMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && chatMsg.trim() && chatMutation.mutate(chatMsg)}
                            disabled={(myPlayer.silencedTurns || 0) > 0}
                            className={cn(
                               "flex-1 bg-black text-xs px-3 py-2 rounded focus:outline-none",
                               (myPlayer.silencedTurns || 0) > 0 
                                 ? "border border-red-500/50 text-red-500 cursor-not-allowed placeholder:text-red-500/50" 
                                 : "border border-green-500/30 text-green-400 focus:border-green-500"
                            )}
                          />
                          <Button 
                             onClick={() => chatMutation.mutate(chatMsg)} 
                             disabled={!chatMsg.trim() || chatMutation.isPending || (myPlayer.silencedTurns || 0) > 0} 
                             className={cn("px-3", (myPlayer.silencedTurns || 0) > 0 ? "bg-red-500/20 text-red-500" : "bg-green-500 hover:bg-green-400 text-black")}
                          >
                             <Send className="w-4 h-4" />
                          </Button>
                       </div>
                     </>
                  )}
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
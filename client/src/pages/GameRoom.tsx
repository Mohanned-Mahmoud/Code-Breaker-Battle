import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Share2, Lock, Shield, Zap, Terminal, Info, Edit2, Shuffle, Timer, Settings2, Bug, Eye, EyeOff, Ghost, Radio, Copy, Anchor, FileDown, Bomb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type GameStateResponse, type GameLog } from "@shared/schema";

const useSFX = () => {
  const playTyping = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };
  const playBeep = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };
  return { playTyping, playBeep };
};

function TerminalLog({ logs }: { logs: GameLog[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);
  
  return (
    <div 
      ref={scrollRef} 
      className="font-mono text-xs md:text-sm flex-1 min-h-0 overflow-y-auto p-4 bg-black/60 border border-primary/20 rounded-sm custom-scrollbar relative"
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; display: block; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 20, 0, 0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #00ff00; border-radius: 4px; }
      `}</style>
      
      <div className="flex flex-col-reverse space-y-reverse space-y-2">
        <AnimatePresence initial={false}>
          {logs.slice().reverse().map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className="opacity-40 select-none">[{new Date(log.timestamp!).toLocaleTimeString()}]</span>
              <span className={cn(
                "flex-1 break-words font-medium",
                log.message.includes("[P1]") ? "text-cyan-400" :      
                log.message.includes("[P2]") ? "text-fuchsia-400" :   
                log.type === 'success' ? 'text-green-500' : 
                log.type === 'error' ? 'text-red-500' : 
                log.type === 'warning' ? 'text-yellow-500' : 'text-primary/70'
              )}>
                {">"} {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="sticky bottom-0 left-0 animate-pulse w-2 h-4 bg-primary/50" />
    </div>
  );
}

function DigitInput({ value, onChange, disabled, variant = 'default' }: { 
  value: string, onChange: (val: string) => void, disabled?: boolean, variant?: 'default' | 'p1' | 'p2'
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { playTyping } = useSFX();

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newVal = value.split(''); newVal[index] = val.slice(-1);
    onChange(newVal.join(''));
    if (val && index < 3) inputs.current[index + 1]?.focus();
    playTyping();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  return (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i} ref={el => inputs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={value[i] || ""} disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 bg-black text-center text-2xl font-bold rounded-sm border-2 transition-all outline-none",
            "neon-border focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
            variant === 'p1' ? 'border-cyan-500 text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 
            variant === 'p2' ? 'border-fuchsia-500 text-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.5)]' : 'border-primary text-primary'
          )}
        />
      ))}
    </div>
  );
}

export default function GameRoom() {
  const [, params] = useRoute("/game/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playBeep } = useSFX();
  
  const id = parseInt(params?.id || "0");
  const [guessVal, setGuessVal] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [showTransition, setShowTransition] = useState(false);
  const [showMyCode, setShowMyCode] = useState(false);

  const [powerupState, setPowerupState] = useState<{ active: 'change' | 'swap' | null; code: string; step1Index: number | null; }>({ active: null, code: "", step1Index: null });

  const [myRole, setMyRole] = useState<'p1' | 'p2' | null>(() => {
    const saved = localStorage.getItem(`role_${id}`); return (saved === 'p1' || saved === 'p2') ? saved : null;
  });

  const downloadMasterLog = async () => {
    try {
      const res = await fetch(`/api/games/${id}/master-logs`);
      const masterLogs = await res.json();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast({ title: "POPUP BLOCKED", description: "Allow popups to download the log.", variant: "destructive" }); return; }

      let htmlContent = `
        <html>
          <head>
            <title>Master_Log_Room_${id}</title>
            <style>
              body { background-color: #050505; color: #00ff00; font-family: 'Courier New', Courier, monospace; padding: 40px; }
              .header { text-align: center; color: #E879F9; margin-bottom: 30px; letter-spacing: 2px; }
              .meta { color: #888; font-size: 12px; margin-bottom: 20px; border-bottom: 1px dashed #333; padding-bottom: 10px; }
              .log-entry { margin-bottom: 8px; line-height: 1.4; font-size: 14px; }
              .time { color: #555; margin-right: 10px; }
              .msg-success { color: #22c55e; }
              .msg-error { color: #ef4444; }
              .msg-warning { color: #eab308; }
              .msg-info { color: #aaaaaa; }
              .msg-p1 { color: #22d3ee; }
              .msg-p2 { color: #e879f9; }
              .corrupted { opacity: 0.7; }
              .corrupted-tag { color: #ef4444; font-size: 10px; margin-left: 5px; border: 1px solid #ef4444; padding: 1px 4px; border-radius: 2px;}
              @media print { body { background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="header"><h2>ENCRYPTION_WAR_OS // MASTER LOG ARCHIVE</h2></div>
            <div class="meta">ROOM ID: ${id} | EXTRACTION DATE: ${new Date().toLocaleString()} | STATUS: DECRYPTED</div>
      `;

      masterLogs.forEach((log: any) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          let msgClass = 'msg-info';
          if (log.type === 'success') msgClass = 'msg-success';
          else if (log.type === 'error') msgClass = 'msg-error';
          else if (log.type === 'warning') msgClass = 'msg-warning';
          if (log.message.includes("[P1]")) msgClass = 'msg-p1';
          if (log.message.includes("[P2]")) msgClass = 'msg-p2';

          const corruptedMark = log.isCorrupted ? `<span class="corrupted-tag">RECOVERED FROM VIRUS</span>` : '';
          htmlContent += `<div class="log-entry ${log.isCorrupted ? 'corrupted' : ''}"><span class="time">[${time}]</span><span class="${msgClass}">> ${log.message}</span> ${corruptedMark}</div>`;
      });

      htmlContent += `<script>window.onload = () => { window.print(); }</script></body></html>`;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) { toast({ title: "ERROR", description: "Failed to fetch master logs.", variant: "destructive" }); }
  };

  const fetchMyCode = async () => {
    const res = await fetch(`/api/games/${id}/code/${myRole}`); return (await res.json()).code;
  };

  const { data: game, isLoading, error } = useQuery<GameStateResponse>({
    queryKey: ['game', id], queryFn: () => fetch(`/api/games/${id}`).then(res => res.json()), refetchInterval: 1000
  });

  const { data: logs = [] } = useQuery<GameLog[]>({
    queryKey: ['logs', id], queryFn: () => fetch(`/api/games/${id}/logs`).then(res => res.json()), refetchInterval: 1000
  });

  const setupMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/games/${id}/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
    onSuccess: (data, variables) => {
      setMyRole(variables.player); localStorage.setItem(`role_${id}`, variables.player); setSetupCode("");
      setShowTransition(true); setTimeout(() => setShowTransition(false), 3000); queryClient.invalidateQueries({ queryKey: ['game', id] });
    }
  });

  const guessMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/games/${id}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
    onSuccess: () => { setGuessVal(""); playBeep(); queryClient.invalidateQueries({ queryKey: ['game', id] }); queryClient.invalidateQueries({ queryKey: ['logs', id] }); }
  });

  const powerupMutation = useMutation({
    mutationFn: (args: any) => fetch(`/api/games/${id}/powerup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: myRole, ...args }) }).then(res => res.json()),
    onSuccess: () => { toast({ title: "SYSTEM UPDATE", description: "Powerup Activated Successfully" }); queryClient.invalidateQueries({ queryKey: ['game', id] }); },
    onError: (err) => { toast({ title: "ERROR", description: err.message, variant: "destructive" }); }
  });

  const restartMutation = useMutation({
    mutationFn: () => fetch(`/api/games/${id}/restart`, { method: 'POST' }).then(res => res.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['game', id] }); queryClient.invalidateQueries({ queryKey: ['logs', id] }); setGuessVal(""); setSetupCode(""); }
  });

  const timeoutMutation = useMutation({
    mutationFn: () => fetch(`/api/games/${id}/timeout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: myRole }) }).then(res => res.json()),
    onSuccess: () => { toast({ title: "TIMEOUT", description: "You took too long! Turn skipped.", variant: "destructive" }); setGuessVal(""); setPowerupState({ active: null, code: "", step1Index: null }); queryClient.invalidateQueries({ queryKey: ['game', id] }); }
  });

  const activeP = game?.turn;
  const isMyTurn = myRole === activeP;
  
  // --- CONDITIONAL CHECKS FOR MODES AND CUSTOM SETTINGS ---
  const g = game as any;
  const isBlitz = g?.mode === 'blitz';
  const isGlitch = g?.mode === 'glitch';
  const isCustom = g?.mode === 'custom';
  const isTimed = isBlitz || (isCustom && g?.customTimer);
  
  const showFirewallOrDdos = isCustom ? g?.allowFirewall : true; 
  const showVirus = isCustom ? g?.allowVirus : false; 
  const showBruteforce = isCustom ? g?.allowBruteforce : true;
  const showChangeDigit = isCustom ? g?.allowChangeDigit : true;
  const showSwapDigits = isCustom ? g?.allowSwapDigits : true;
  const showEmp = isCustom ? g?.allowEmp : false;
  const showSpyware = isCustom ? g?.allowSpyware : false;
  const showHoneypot = isCustom ? g?.allowHoneypot : false;
  const showPhishing = isCustom ? g?.allowPhishing : isGlitch; // NEW
  const showLogicBomb = isCustom ? g?.allowLogicBomb : isGlitch; // NEW

  useEffect(() => {
    if (isTimed && game?.status === 'playing' && isMyTurn) {
      if (g?.timeLeft === 0 && !timeoutMutation.isPending) timeoutMutation.mutate();
    }
  }, [g?.timeLeft, isMyTurn, game?.status, isTimed]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin" /></div>;
  if (error || !game) return <div className="h-screen flex items-center justify-center bg-background">Connection Error</div>;

  if (game.status === 'finished') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-black glitch-effect uppercase text-center"><span className={game.winner === 'p1' ? "text-cyan-500" : "text-fuchsia-500"}>P{game.winner === 'p1' ? '01' : '02'}</span> VICTORIOUS</h1>
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Button variant="outline" className="neon-border w-full sm:w-auto" onClick={() => setLocation("/")}>EXIT ROOM</Button>
          <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 w-full sm:w-auto" onClick={downloadMasterLog}><FileDown className="w-4 h-4 mr-2" /> UNCORRUPTED LOG</Button>
          <Button className="neon-border bg-primary/20 hover:bg-primary/40 w-full sm:w-auto" onClick={() => restartMutation.mutate()} disabled={restartMutation.isPending}>{restartMutation.isPending ? "REBOOTING..." : "PLAY AGAIN"}</Button>
        </div>
      </div>
    );
  }

  if (!game.p1Setup || !game.p2Setup) {
    const targetRole = !game.p1Setup ? 'p1' : 'p2';
    if (myRole && myRole !== targetRole) {
       return (
         <div className="h-screen flex flex-col items-center justify-center bg-background p-4 text-center space-y-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
            
            <div>
              <h2 className="text-2xl font-black font-mono tracking-widest text-primary animate-pulse glitch-effect">WAITING FOR P2...</h2>
              <p className="text-xs font-mono opacity-50 mt-2 uppercase tracking-[0.2em]">Share the Room ID or Uplink below</p>
            </div>
            
            <div className="flex flex-col items-center gap-6 p-8 border border-primary/20 rounded-lg bg-black/60 shadow-[0_0_30px_rgba(0,255,0,0.05)] w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono opacity-50 mb-1 tracking-[0.3em]">ROOM ID</span>
                    <div className="flex items-center gap-3">
                        <span className="text-5xl md:text-6xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] tracking-widest">{id}</span>
                        <Button size="icon" variant="outline" className="h-10 w-10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all" onClick={() => { navigator.clipboard.writeText(id.toString()); toast({ title: "Room ID Copied!" }); }}>
                            <Copy className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="w-full h-px bg-primary/10"></div>
                
                <div className="w-full text-left">
                    <span className="text-[10px] font-mono opacity-50 tracking-[0.3em] block mb-2 text-center">OR SHARE UPLINK</span>
                    <div className="flex gap-2 w-full">
                        <code className="flex-1 bg-black border border-primary/30 p-3 rounded text-xs select-all overflow-hidden text-ellipsis whitespace-nowrap text-primary/70">{window.location.href}</code>
                        <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/20 px-4" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Uplink Copied!" }); }}>
                            <Share2 className="w-4 h-4 mr-2" /> COPY
                        </Button>
                    </div>
                </div>
            </div>
         </div>
       );
    }

    if (showTransition) return <div className="h-screen flex flex-col items-center justify-center bg-black"><h1 className="text-3xl font-bold tracking-widest">ENCRYPTION LOCKED</h1></div>;

    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 bg-black/40 border border-primary/30 rounded-sm space-y-10">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-primary opacity-50" />
            <h1 className="text-2xl font-bold tracking-widest uppercase">PLAYER <span className={targetRole === 'p1' ? "text-cyan-500" : "text-fuchsia-500"}>{targetRole === 'p1' ? '01' : '02'}</span></h1>
            <p className="text-xs font-mono opacity-50">DEFINE YOUR 4-DIGIT MASTER KEY</p>
          </div>
          <DigitInput value={setupCode} onChange={setSetupCode} variant={targetRole} />
          <Button className="w-full h-12 neon-border bg-primary/10 hover:bg-primary/20" disabled={setupCode.length < 4 || setupMutation.isPending} onClick={() => setupMutation.mutate({ player: targetRole, code: setupCode })}>{setupMutation.isPending ? "ENCRYPTING..." : "INITIALIZE KEY"}</Button>
        </div>
      </div>
    );
  }

  const p1Powerups = { firewall: game.p1FirewallUsed ?? false, timeHack: g.p1TimeHackUsed ?? false, virus: g.p1VirusUsed ?? false, bruteforce: game.p1BruteforceUsed ?? false, changeDigit: g.p1ChangeDigitUsed ?? false, swapDigits: g.p1SwapDigitsUsed ?? false, emp: g.p1EmpUsed ?? false, spyware: g.p1SpywareUsed ?? false, honeypot: g.p1HoneypotUsed ?? false, phishing: g.p1PhishingUsed ?? false, logicBomb: g.p1LogicBombUsed ?? false };
  const p2Powerups = { firewall: game.p2FirewallUsed ?? false, timeHack: g.p2TimeHackUsed ?? false, virus: g.p2VirusUsed ?? false, bruteforce: game.p2BruteforceUsed ?? false, changeDigit: g.p2ChangeDigitUsed ?? false, swapDigits: g.p2SwapDigitsUsed ?? false, emp: g.p2EmpUsed ?? false, spyware: g.p2SpywareUsed ?? false, honeypot: g.p2HoneypotUsed ?? false, phishing: g.p2PhishingUsed ?? false, logicBomb: g.p2LogicBombUsed ?? false };
  const myPowerups = myRole === 'p1' ? p1Powerups : p2Powerups;
  
  // Logic Bomb Status Tracker
  const silencedTurns = myRole === 'p1' ? (g.p1SilencedTurns || 0) : (g.p2SilencedTurns || 0);
  const isSilenced = silencedTurns > 0;

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row relative">
      <div className={cn("absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none z-0 transition-colors duration-500", activeP === 'p1' ? 'stroke-cyan-500' : 'stroke-fuchsia-500')}>
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none"><path d="M20 20 L80 80 M80 20 L20 80" strokeWidth="0.5" /><circle cx="50" cy="50" r="40" strokeWidth="0.5" /></svg>
      </div>

      <div className="flex-1 flex flex-col p-4 space-y-4 z-10 overflow-hidden">
        <div className="flex justify-between items-center border-b border-primary/20 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-primary/70 hover:text-primary"><Info className="h-5 w-5" /></Button></DialogTrigger>
              <DialogContent className="border-primary/50 bg-black/90 text-primary overflow-y-auto max-h-[80vh] custom-scrollbar">
                <DialogHeader>
                  <DialogTitle className="text-xl tracking-widest uppercase mb-4 border-b border-primary/30 pb-2 flex items-center gap-2">
                    Battle Manual 
                    {isBlitz && <span className="text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded">BLITZ</span>}
                    {isGlitch && <span className="text-purple-500 text-xs bg-purple-500/10 px-2 py-1 rounded">GLITCH</span>}
                    {isCustom && <span className="text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded">CUSTOM</span>}
                  </DialogTitle>
                  <DialogDescription className="space-y-4 text-left pt-2">
                    
                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-primary" /> MISSION</h3>
                      <p className="text-xs font-mono opacity-80">Crack the opponent's 4-digit code before they crack yours.</p>
                      {isTimed && <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs font-mono">⚠️ 30s TIMER ACTIVE: If time runs out, your turn is skipped.</div>}
                      {isGlitch && <div className="mt-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded text-purple-400 text-xs font-mono">👾 VIRUS ACTIVE: Expect random rule changes every 3 turns.</div>}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-500" /> EQUIPPED ARSENAL</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono opacity-80">
                        {showFirewallOrDdos && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className={cn("block mb-1 flex items-center gap-1", isTimed ? "text-orange-500" : "text-yellow-500")}>
                              {isTimed ? <><Timer className="w-3 h-3"/> DDOS ATTACK</> : "🛡️ FIREWALL"}
                            </strong>
                            <span className={cn("text-[10px] block", isTimed ? "text-orange-400 opacity-90" : "opacity-70")}>
                                {isTimed ? "-20s from enemy's next turn." : "Blocks turn switch. Gives 1 extra turn."}
                            </span>
                          </div>
                        )}
                        {showVirus && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-green-500 block mb-1 flex items-center gap-1"><Bug className="w-3 h-3"/> VIRUS</strong>
                            <span className="text-[10px] block opacity-70">Deletes all opponent's system logs.</span>
                          </div>
                        )}
                        {showBruteforce && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-red-500 block mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> BRUTEFORCE</strong>
                            <span className="text-[10px] block opacity-70">Reveals 1st digit permanently.</span>
                          </div>
                        )}
                        {showChangeDigit && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-blue-500 block mb-1 flex items-center gap-1"><Edit2 className="w-3 h-3"/> CHANGE DIGIT</strong>
                            <span className="text-[10px] block opacity-70">Mutate one digit in your code.</span>
                          </div>
                        )}
                        {showSwapDigits && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-purple-500 block mb-1 flex items-center gap-1"><Shuffle className="w-3 h-3"/> SWAP DIGITS</strong>
                            <span className="text-[10px] block opacity-70">Swap positions of two digits.</span>
                          </div>
                        )}
                        {showEmp && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-cyan-400 block mb-1 flex items-center gap-1"><Radio className="w-3 h-3"/> EMP JAMMER</strong>
                            <span className="text-[10px] block opacity-70">Jams enemy signals. Next guess returns corrupted data.</span>
                          </div>
                        )}
                        {showSpyware && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-emerald-400 block mb-1 flex items-center gap-1"><Eye className="w-3 h-3"/> SPYWARE</strong>
                            <span className="text-[10px] block opacity-70">Calculates and reveals the sum of enemy digits.</span>
                          </div>
                        )}
                        {showHoneypot && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-indigo-400 block mb-1 flex items-center gap-1"><Ghost className="w-3 h-3"/> HONEYPOT</strong>
                            <span className="text-[10px] block opacity-70">Generates fake feedback data for the enemy's next guess.</span>
                          </div>
                        )}
                        {showPhishing && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-pink-400 block mb-1 flex items-center gap-1"><Anchor className="w-3 h-3"/> PHISHING</strong>
                            <span className="text-[10px] block opacity-70">Steals a random unused powerup from the enemy's arsenal.</span>
                          </div>
                        )}
                        {showLogicBomb && (
                          <div className="border border-primary/20 p-2 rounded bg-black/50">
                            <strong className="text-zinc-400 block mb-1 flex items-center gap-1"><Bomb className="w-3 h-3"/> LOGIC BOMB</strong>
                            <span className="text-[10px] block opacity-70">Silences enemy powerups for 2 turns.</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <div className="space-y-1">
              <h2 className="text-xs opacity-50 font-mono tracking-widest flex gap-1">
                SESSION 
                { isBlitz && <span className="text-red-500 font-bold">[BLITZ]</span> }
                { isGlitch && <span className="text-purple-500 font-bold">[GLITCH]</span> }
                { isCustom && <span className="text-blue-500 font-bold"><Settings2 className="w-3 h-3 inline"/></span> }
              </h2>
              <p className="text-lg font-bold tracking-tighter">{id}</p>
            </div>
          </div>

          <div className="text-center absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            {isTimed && (
              <div className={cn("text-3xl font-black font-mono tracking-widest mb-1 transition-colors text-center", (g?.timeLeft ?? 30) <= 10 ? "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]")}>
                 00:{String(g?.timeLeft ?? 0).padStart(2, '0')}
              </div>
            )}
            {isGlitch && (
              <div className="mb-2 px-2 py-1 text-[10px] font-bold tracking-widest text-purple-400 border border-purple-500/30 rounded bg-purple-500/10 animate-pulse">
                  GLITCH IN: {Math.max(1, (g?.nextGlitchTurn || 3) - (g?.turnCount || 0))}
              </div>
            )}
            <div className={cn("px-4 py-1 border rounded-full text-[10px] font-bold tracking-widest transition-all", isMyTurn ? "border-primary text-primary animate-pulse" : "border-primary/30 text-primary/30")}>
              {isMyTurn ? "YOUR TURN" : `WAITING...`}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/40 hover:text-primary" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Uplink copied" }); }}><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          
          <div className="flex-shrink-0 flex flex-col space-y-4 md:space-y-6 justify-center items-center bg-black/20 p-4 md:p-8 border border-primary/10 rounded-sm relative min-h-[350px]">
            
            {/* --- RESPONSIVE IDENTITY & CODE REVEAL PANEL --- */}
            <div className="absolute top-0 left-0 w-full p-2 sm:p-3 flex justify-between items-start z-20 pointer-events-none">
              
              {/* Left Side: Identity */}
              <div className="text-[9px] sm:text-[10px] font-mono opacity-80 bg-black/60 px-2 py-1 rounded pointer-events-auto border border-primary/20 backdrop-blur-sm flex items-center gap-1 sm:gap-2">
                <span className="opacity-50 hidden sm:inline">IDENTITY:</span>
                <span className="sm:hidden opacity-50">ID:</span>
                <span className={myRole === 'p1' ? "text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : "text-fuchsia-400 font-bold drop-shadow-[0_0_5px_rgba(232,121,249,0.5)]"}>
                  {myRole === 'p1' ? 'PLAYER 01' : 'PLAYER 02'}
                </span>
              </div>
              
              {/* Right Side: Hidden Code (Glitch Mode Only) */}
              {isGlitch && (
                <div className="pointer-events-auto flex items-center bg-black/80 border border-primary/40 px-2 py-1 rounded shadow-[0_0_15px_rgba(0,255,0,0.1)] backdrop-blur-md gap-2">
                  <Lock className="w-3 h-3 text-primary/40 hidden sm:block" />
                  <span className="text-[9px] sm:text-[10px] font-mono opacity-50 hidden sm:block uppercase">Master Code:</span>
                  
                  <span className={cn("font-mono text-[10px] sm:text-xs tracking-widest font-black w-10 text-center", showMyCode ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "text-primary/50 translate-y-[1px]")}>
                    {showMyCode ? (myRole === 'p1' ? game.p1Code : game.p2Code) : "••••"}
                  </span>
                  
                  <div className="w-px h-3 bg-primary/30 mx-0.5"></div>
                  
                  <button onClick={() => setShowMyCode(!showMyCode)} className="opacity-50 hover:opacity-100 text-primary hover:text-white transition-all hover:scale-110 active:scale-95 px-1">
                    {showMyCode ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </button>
                </div>
              )}
            </div>

            {powerupState.active ? (
              <div className="space-y-6 w-full flex flex-col items-center animate-in fade-in duration-300">
                <div className="space-y-2 text-center"><h3 className={cn("text-sm font-bold animate-pulse tracking-widest uppercase", powerupState.active === 'change' ? "text-blue-500" : "text-purple-500")}>{powerupState.active === 'change' ? "Select Digit to Mutate" : "Select Two Digits to Swap"}</h3></div>
                <div className="flex gap-4 justify-center">
                  {powerupState.code.split('').map((digit, i) => {
                     if (powerupState.active === 'change' && powerupState.step1Index === i) {return <input key={i} autoFocus className="w-12 h-12 md:w-16 md:h-16 bg-white text-black text-center text-2xl font-bold rounded-sm outline-none border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" maxLength={1} onChange={(e) => { const val = e.target.value; if (/^\d$/.test(val)) { powerupMutation.mutate({ type: 'changeDigit', targetIndex: i, newDigit: val }); setPowerupState({ active: null, code: "", step1Index: null }); } }} />;
                     }
                     const isSelected = powerupState.step1Index === i;
                     return <button key={i} className={cn("w-12 h-12 md:w-16 md:h-16 bg-black text-center text-2xl font-bold rounded-sm border-2 transition-all outline-none neon-border", isSelected ? "border-white text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-primary/50 text-primary/50 hover:border-primary hover:text-primary")} onClick={() => { if (powerupState.active === 'change') { setPowerupState(prev => ({ ...prev, step1Index: i })); } else if (powerupState.active === 'swap') { if (powerupState.step1Index === null) { setPowerupState(prev => ({ ...prev, step1Index: i })); } else { if (powerupState.step1Index === i) { setPowerupState(prev => ({ ...prev, step1Index: null })); return; } powerupMutation.mutate({ type: 'swapDigits', swapIndex1: powerupState.step1Index, swapIndex2: i }); setPowerupState({ active: null, code: "", step1Index: null }); } } }}>{digit}</button>;
                  })}
                </div>
                <Button variant="ghost" className="mt-4 text-xs opacity-50 hover:opacity-100 text-red-400 hover:text-red-300" onClick={() => setPowerupState({ active: null, code: "", step1Index: null })}>ABORT MODIFICATION</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  <h3 className="text-sm font-mono opacity-40 uppercase tracking-[0.3em]">Neural Input Required</h3>
                  <p className="text-xs opacity-20 italic">"Guess the enemy encryption to compromise system."</p>
                </div>
                
                <DigitInput value={guessVal} onChange={setGuessVal} disabled={!isMyTurn} variant={activeP as 'p1' | 'p2'} />

                {(!showFirewallOrDdos && !showVirus && !showBruteforce && !showChangeDigit && !showSwapDigits && !showEmp && !showSpyware && !showHoneypot && !showPhishing && !showLogicBomb) ? (
                   <div className="text-[10px] font-mono opacity-30 border border-primary/10 p-2 rounded w-full max-w-sm text-center mt-4">NO POWERUPS ENABLED</div>
                ) : (
                  <div className="relative w-full max-w-sm mt-4">
                      {/* SILENCED STATE OVERLAY */}
                      {isSilenced && (
                        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded border border-red-500/50 p-2">
                           <Bomb className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-1 animate-pulse" />
                           <p className="text-red-500 font-black tracking-widest text-[10px] sm:text-xs">SYSTEM SILENCED</p>
                           <p className="text-red-400/80 font-mono text-[8px] sm:text-[10px]">{silencedTurns} TURNS REMAINING</p>
                        </div>
                      )}

                      <div className={cn("grid grid-cols-2 gap-2 w-full", isSilenced && "opacity-30 pointer-events-none grayscale")}>
                          {showFirewallOrDdos && (
                              isTimed ? (
                                  <Button variant="outline" className="w-full border-orange-500/50 text-orange-500 hover:bg-orange-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.timeHack || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'timeHack' })}><Timer className="w-3 h-3 mr-1" /> DDOS -20S</Button>
                              ) : (
                                  <Button variant="outline" className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.firewall || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'firewall' })}><Shield className="w-3 h-3 mr-1" /> FIREWALL</Button>
                              )
                          )}
                          {showVirus && <Button variant="outline" className="w-full border-green-500/50 text-green-500 hover:bg-green-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.virus || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'virus' })}><Bug className="w-3 h-3 mr-1" /> VIRUS</Button>}
                          {showBruteforce && <Button variant="outline" className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.bruteforce || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'bruteforce' })}><Zap className="w-3 h-3 mr-1" /> BRUTEFORCE</Button>}
                          {showChangeDigit && <Button variant="outline" className="w-full border-blue-500/50 text-blue-500 hover:bg-blue-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.changeDigit || powerupMutation.isPending} onClick={async () => { const code = await fetchMyCode(); setPowerupState({ active: 'change', code, step1Index: null }); }}><Edit2 className="w-3 h-3 mr-1" /> CHANGE DIGIT</Button>}
                          {showSwapDigits && <Button variant="outline" className="w-full border-purple-500/50 text-purple-500 hover:bg-purple-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.swapDigits || powerupMutation.isPending} onClick={async () => { const code = await fetchMyCode(); setPowerupState({ active: 'swap', code, step1Index: null }); }}><Shuffle className="w-3 h-3 mr-1" /> SWAP DIGITS</Button>}
                          
                          {/* --- THE NEW EVIL ARSENAL BUTTONS --- */}
                          {showEmp && <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-500 hover:bg-cyan-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.emp || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'emp' })}><Radio className="w-3 h-3 mr-1" /> EMP JAMMER</Button>}
                          {showSpyware && <Button variant="outline" className="w-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.spyware || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'spyware' })}><Eye className="w-3 h-3 mr-1" /> SPYWARE</Button>}
                          {showHoneypot && <Button variant="outline" className="w-full border-indigo-500/50 text-indigo-500 hover:bg-indigo-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.honeypot || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'honeypot' })}><Ghost className="w-3 h-3 mr-1" /> HONEYPOT</Button>}
                          {showPhishing && <Button variant="outline" className="w-full border-pink-500/50 text-pink-400 hover:bg-pink-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.phishing || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'phishing' })}><Anchor className="w-3 h-3 mr-1" /> PHISHING</Button>}                  
                          {showLogicBomb && <Button variant="outline" className="w-full border-zinc-500/50 text-zinc-400 hover:bg-zinc-500/10 text-[10px]" disabled={!isMyTurn || myPowerups.logicBomb || powerupMutation.isPending} onClick={() => powerupMutation.mutate({ type: 'logicBomb' })}><Bomb className="w-3 h-3 mr-1" /> LOGIC BOMB</Button>}
                      </div>
                  </div>
                )}

                <Button className={cn("w-full max-w-sm h-14 neon-border text-lg tracking-widest font-black transition-all mt-2", !isMyTurn && "opacity-50 grayscale cursor-not-allowed")} disabled={guessVal.length < 4 || guessMutation.isPending || !isMyTurn} onClick={() => guessMutation.mutate({ player: activeP, guess: guessVal })}>{guessMutation.isPending ? "LAUNCHING..." : !isMyTurn ? "OPPONENT TURN..." : "EXECUTE ATTACK"}</Button>
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 opacity-50 flex-shrink-0">
              <Terminal className="w-3 h-3" />
              <span className="text-[10px] font-mono tracking-widest uppercase">System Logs // Real-time</span>
            </div>
            <TerminalLog logs={logs} />
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 text-[8px] font-mono opacity-20 uppercase tracking-widest">
        ENCRYPTION_WAR_OS // STATUS: STABLE // CONNECTION: ENCRYPTED
      </div>
    </div>
  );
}
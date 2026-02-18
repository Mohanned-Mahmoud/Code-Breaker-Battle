import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  Loader2, Plus, Terminal, Lock, Info, Timer, Zap, Settings2, Shield, Edit2, Shuffle, Bug, Eye, Ghost, Radio, LogIn, User, Users, ArrowLeft, ArrowDown, Crosshair, Skull, Crown, Anchor, Target, Bomb
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CyberToggle = ({ label, icon, checked, onChange, colorClass }: any) => (
  <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer border border-transparent hover:border-primary/20 transition-all" onClick={() => onChange(!checked)}>
    <span className={cn("text-[10px] font-bold tracking-widest flex items-center gap-2", checked ? colorClass : "text-primary/40")}>
      {icon} {label}
    </span>
    <div className={cn("w-8 h-4 rounded-full border transition-all relative", checked ? `bg-current ${colorClass} border-current` : "bg-black border-primary/40")}>
      <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", checked ? "bg-black right-0.5" : "bg-primary/40 left-0.5")} />
    </div>
  </div>
);

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Views: main, 1v1, party
  const [menuView, setMenuView] = useState<'main' | '1v1' | 'party'>('main');

  // --- 1v1 STATE ---
  const [mode, setMode] = useState<'normal' | 'blitz' | 'glitch' | 'custom'>('normal');
  const [joinId, setJoinId] = useState(""); 
  
  // --- PARTY STATE ---
  const [partySubMode, setPartySubMode] = useState<'free_for_all' | 'battle_royale' | 'bounty_contracts'>('free_for_all');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [joinPartyId, setJoinPartyId] = useState("");
  const [partyWinCondition, setPartyWinCondition] = useState<'points'|'elimination'>('points');
  const [partyTargetPoints, setPartyTargetPoints] = useState(15);

  const [customSettings, setCustomSettings] = useState({
      timer: false, firewall: true, virus: false, bruteforce: true, changeDigit: true, swapDigits: true,
      emp: false, spyware: false, honeypot: false, phishing: false, logicBomb: false
  });

  const activePowerupsCount = [
    customSettings.firewall, customSettings.virus, customSettings.bruteforce, customSettings.changeDigit, customSettings.swapDigits,
    customSettings.emp, customSettings.spyware, customSettings.honeypot, customSettings.phishing, customSettings.logicBomb
  ].filter(Boolean).length;

  const togglePowerup = (key: keyof typeof customSettings, value: boolean) => {
    if (menuView === '1v1' && key !== 'timer' && value && activePowerupsCount >= 4) {
      toast({ 
        title: "MAXIMUM CAPACITY", 
        description: "You can only equip up to 4 powerups in 1v1 matches.", 
        variant: "destructive" 
      });
      return;
    }
    setCustomSettings(p => ({ ...p, [key]: value }));
  };

  const createGame = useMutation({
    mutationFn: async ({ selectedMode, settings }: { selectedMode: string, settings?: any }) => {
      const res = await fetch(api.games.create.path, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode, customSettings: settings })
      });
      return await res.json();
    },
    onSuccess: (data) => { setLocation(`/game/${data.id}`); }
  });

  const createPartyGame = useMutation({
    mutationFn: async ({ subMode, players, settings, winCond, targetPts }: any) => {
      const res = await fetch('/api/party/create', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subMode, maxPlayers: players, customSettings: settings, winCondition: winCond, targetPoints: targetPts }) 
      });
      return await res.json();
    },
    onSuccess: (data) => { setLocation(`/party/${data.id}`); }
  });

  const handleJoinRoom = () => { if (!joinId.trim()) return; setLocation(`/game/${joinId}`); };
  const handleJoinPartyRoom = () => { if (!joinPartyId.trim()) return; setLocation(`/party/${joinPartyId}`); };

  const is1v1Overloaded = mode === 'custom' && activePowerupsCount > 4;

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-background custom-scrollbar relative">
      <div className="fixed -bottom-10 -left-10 w-64 h-64 opacity-5 pointer-events-none rotate-12 z-0">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-primary fill-none"><path d="M10 10 Q 50 10 50 50 T 90 90" strokeWidth="0.5" /><rect x="45" y="45" width="10" height="10" strokeWidth="0.5" /></svg>
      </div>

      <div className="min-h-full w-full flex flex-col items-center px-4 relative z-10">
        <div className="flex-1 min-h-[2rem]"></div>
        <div className="w-full max-w-2xl flex flex-col items-center shrink-0 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 w-full text-center mb-10">
            <div className="flex items-center justify-center gap-2 text-primary opacity-40"><Terminal className="w-4 h-4" /><span className="text-xs font-mono tracking-[0.5em] uppercase">Tactical Neural Interface</span></div>
            <h1 className="text-6xl md:text-8xl font-black font-mono tracking-tighter text-primary glitch-effect uppercase" data-text="ENCRYPTION">ENCRYPTION<br/><span className="text-primary/40">WAR</span></h1>
            <p className="text-primary/40 font-mono text-sm tracking-wide max-w-md mx-auto leading-relaxed hidden md:block">Neural link established. Objective: Compromise opponent's master key. <br/><span className="text-primary/20 italic">Do not let your encryption fail.</span></p>
          </motion.div>

          <div className="w-full max-w-sm mx-auto">
            <AnimatePresence mode="wait">
              {menuView === 'main' && (
                <motion.div key="main-menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="flex flex-col w-full space-y-4">
                  <button onClick={() => setMenuView('1v1')} className="group relative w-full flex flex-col items-center justify-center p-8 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
                     <User className="w-10 h-10 mb-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                     <span className="font-mono font-black tracking-[0.2em] text-2xl uppercase">1V1 BATTLE</span>
                     <span className="text-[10px] font-mono opacity-50 mt-2 tracking-widest uppercase">Tactical Duel</span>
                  </button>
                  <button onClick={() => setMenuView('party')} className="group relative w-full flex flex-col items-center justify-center p-8 bg-fuchsia-500/10 border border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500/20 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(232,121,249,0.1)]">
                     <Users className="w-10 h-10 mb-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                     <span className="font-mono font-black tracking-[0.2em] text-2xl uppercase">PARTY MODE</span>
                     <span className="text-[10px] font-mono opacity-50 mt-2 tracking-widest uppercase">3 to 6 Players Chaos</span>
                     {/* RED NOTIFICATION DOT FOR PARTY MODE */}
                     <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </button>

                  <div className="relative w-full pt-8">
                    <motion.div 
                      animate={{ y: [0, 6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
                    >
                      <div className="bg-red-500 border border-red-400 text-white text-[9px] font-black px-3 py-1 rounded shadow-[0_0_15px_rgba(239,68,68,0.8)] tracking-widest uppercase flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        CHECK THE NEW UPDATE!
                      </div>
                      <ArrowDown className="w-4 h-4 text-red-500 mt-0.5" />
                    </motion.div>

                    <Link href="/how-to-play">
                      <Button variant="outline" className="w-full h-12 neon-border text-primary hover:bg-primary/10 tracking-[0.2em] font-mono border-primary/40 text-xs">
                        <Info className="mr-2 h-3 w-3" /> HOW TO PLAY
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {menuView === '1v1' && (
                <motion.div key="1v1-menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="flex flex-col items-center w-full space-y-6">
                  <div className="flex w-full group relative shadow-[0_0_20px_rgba(0,255,0,0.05)] focus-within:shadow-[0_0_20px_rgba(0,255,0,0.15)] transition-all">
                    <div className="flex items-center justify-center bg-primary/10 border border-primary/40 border-r-0 px-3 text-primary"><Terminal className="w-4 h-4 opacity-50" /></div>
                    <input type="text" inputMode="numeric" placeholder="ENTER 1V1 ROOM ID..." value={joinId} onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()} className="flex-1 bg-black/60 border-y border-primary/40 text-primary px-3 py-3 font-mono text-sm tracking-widest focus:outline-none focus:bg-black transition-colors placeholder:text-primary/30 uppercase" />
                    <button onClick={handleJoinRoom} disabled={!joinId} className="px-5 py-3 bg-primary text-black font-black font-mono tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-primary">JOIN</button>
                  </div>
                  <div className="flex items-center gap-4 w-full opacity-30"><div className="flex-1 h-px bg-primary"></div><span className="text-[10px] font-mono tracking-widest">OR HOST 1V1</span><div className="flex-1 h-px bg-primary"></div></div>
                  <div className="w-full space-y-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button onClick={() => setMode('normal')} className={cn("flex flex-col items-center p-3 rounded border transition-all", mode === 'normal' ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,255,0,0.2)]" : "border-primary/20 opacity-50 hover:opacity-100")}><Terminal className="w-5 h-5 mb-2" /><span className="text-[10px] font-bold tracking-wider">NORMAL</span></button>
                      <button onClick={() => setMode('blitz')} className={cn("flex flex-col items-center p-3 rounded border transition-all", mode === 'blitz' ? "border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-primary/20 opacity-50 hover:opacity-100")}><Timer className="w-5 h-5 mb-2" /><span className="text-[10px] font-bold tracking-wider">BLITZ (30s)</span></button>
                      <button onClick={() => setMode('glitch')} className={cn("flex flex-col items-center p-3 rounded border transition-all", mode === 'glitch' ? "border-purple-500 bg-purple-500/20 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "border-primary/20 opacity-50 hover:opacity-100")}><Zap className="w-5 h-5 mb-2" /><span className="text-[10px] font-bold tracking-wider">GLITCH</span></button>
                      <button onClick={() => setMode('custom')} className={cn("flex flex-col items-center p-3 rounded border transition-all", mode === 'custom' ? "border-blue-500 bg-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-primary/20 opacity-50 hover:opacity-100")}><Settings2 className="w-5 h-5 mb-2" /><span className="text-[10px] font-bold tracking-wider">CUSTOM</span></button>
                    </div>
                    
                    <AnimatePresence>
                      {mode === 'custom' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full bg-black/40 border border-blue-500/30 rounded p-3 overflow-hidden">
                           <div className="flex justify-between items-center mb-3 opacity-80 border-b border-blue-500/20 pb-2">
                              <div className="text-[10px] font-mono text-blue-400 text-left">CONFIGURE_RULES.EXE</div>
                              <div className={cn("text-[10px] font-mono font-bold transition-colors", is1v1Overloaded ? "text-red-500 animate-pulse" : "text-blue-400")}>[{activePowerupsCount}/4 EQUIPPED]</div>
                           </div>
                           <div className="grid grid-cols-1 gap-1">
                             <CyberToggle label="30s TIMER (BLITZ)" icon={<Timer className="w-3 h-3"/>} colorClass="text-red-400" checked={customSettings.timer} onChange={(v: boolean) => togglePowerup('timer', v)} />
                             <div className="w-full h-px bg-blue-500/10 my-1 mx-auto" />
                             <CyberToggle label={customSettings.timer ? "DDOS ATTACK (-20S)" : "FIREWALL (EXTRA TURN)"} icon={customSettings.timer ? <Timer className="w-3 h-3"/> : <Shield className="w-3 h-3"/>} colorClass={customSettings.timer ? "text-orange-500" : "text-yellow-400"} checked={customSettings.firewall} onChange={(v: boolean) => togglePowerup('firewall', v)} />
                             <CyberToggle label="BRUTEFORCE" icon={<Zap className="w-3 h-3"/>} colorClass="text-red-500" checked={customSettings.bruteforce} onChange={(v: boolean) => togglePowerup('bruteforce', v)} />
                             <CyberToggle label="CHANGE DIGIT" icon={<Edit2 className="w-3 h-3"/>} colorClass="text-blue-500" checked={customSettings.changeDigit} onChange={(v: boolean) => togglePowerup('changeDigit', v)} />
                             <CyberToggle label="SWAP DIGITS" icon={<Shuffle className="w-3 h-3"/>} colorClass="text-purple-500" checked={customSettings.swapDigits} onChange={(v: boolean) => togglePowerup('swapDigits', v)} />
                             <CyberToggle label="VIRUS (DELETE LOGS)" icon={<Bug className="w-3 h-3"/>} colorClass="text-green-500" checked={customSettings.virus} onChange={(v: boolean) => togglePowerup('virus', v)} />
                             <CyberToggle label="EMP (JAM SIGNAL)" icon={<Radio className="w-3 h-3"/>} colorClass="text-cyan-400" checked={customSettings.emp} onChange={(v: boolean) => togglePowerup('emp', v)} />
                             <CyberToggle label="SPYWARE (DATA LEAK)" icon={<Eye className="w-3 h-3"/>} colorClass="text-emerald-400" checked={customSettings.spyware} onChange={(v: boolean) => togglePowerup('spyware', v)} />
                             <CyberToggle label="HONEYPOT (PROXY LIE)" icon={<Ghost className="w-3 h-3"/>} colorClass="text-indigo-400" checked={customSettings.honeypot} onChange={(v: boolean) => togglePowerup('honeypot', v)} />
                             <CyberToggle label="PHISHING (STEAL)" icon={<Anchor className="w-3 h-3"/>} colorClass="text-pink-400" checked={customSettings.phishing} onChange={(v: boolean) => togglePowerup('phishing', v)} />
                             
                             {/* ADDED LOGIC BOMB HERE */}
                             <CyberToggle label="LOGIC BOMB (SILENCE)" icon={<Bomb className="w-3 h-3"/>} colorClass="text-zinc-400" checked={customSettings.logicBomb} onChange={(v: boolean) => togglePowerup('logicBomb', v)} />
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={() => createGame.mutate({ selectedMode: mode, settings: customSettings })} 
                      disabled={createGame.isPending || is1v1Overloaded} 
                      className={cn(
                        "w-full group relative px-8 py-4 border font-mono tracking-[0.3em] uppercase transition-all active:scale-95 disabled:cursor-not-allowed",
                        is1v1Overloaded 
                          ? "bg-red-900/20 border-red-500 text-red-500 opacity-80" 
                          : "bg-primary/5 border-primary text-primary hover:bg-primary/20 disabled:opacity-50"
                      )}
                    >
                      {createGame.isPending ? "INITIALIZING..." : is1v1Overloaded ? "SYSTEM OVERLOAD: MAX 4" : "CREATE 1V1 ROOM"}
                    </button>
                  </div>
                  <Button variant="ghost" onClick={() => setMenuView('main')} className="w-full h-10 text-primary/60 hover:text-primary tracking-[0.2em] font-mono text-[10px] hover:bg-white/5 border border-transparent hover:border-primary/20 transition-all"><ArrowLeft className="mr-2 h-3 w-3" /> BACK TO MENU</Button>
                </motion.div>
              )}

              {menuView === 'party' && (
                <motion.div key="party-menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="flex flex-col items-center w-full space-y-6">
                  <div className="flex w-full group relative shadow-[0_0_20px_rgba(232,121,249,0.05)] focus-within:shadow-[0_0_20px_rgba(232,121,249,0.15)] transition-all">
                    <div className="flex items-center justify-center bg-fuchsia-500/10 border border-fuchsia-500/40 border-r-0 px-3 text-fuchsia-500"><Users className="w-4 h-4 opacity-50" /></div>
                    <input type="text" inputMode="numeric" placeholder="ENTER PARTY ROOM ID..." value={joinPartyId} onChange={(e) => setJoinPartyId(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleJoinPartyRoom()} className="flex-1 bg-black/60 border-y border-fuchsia-500/40 text-fuchsia-500 px-3 py-3 font-mono text-sm tracking-widest focus:outline-none focus:bg-black transition-colors placeholder:text-fuchsia-500/30 uppercase" />
                    <button onClick={handleJoinPartyRoom} disabled={!joinPartyId} className="px-5 py-3 bg-fuchsia-500 text-black font-black font-mono tracking-widest hover:bg-fuchsia-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-fuchsia-500">JOIN</button>
                  </div>
                  <div className="flex items-center gap-4 w-full opacity-30"><div className="flex-1 h-px bg-fuchsia-500"></div><span className="text-[10px] font-mono tracking-widest text-fuchsia-500">OR HOST PARTY</span><div className="flex-1 h-px bg-fuchsia-500"></div></div>
                  <div className="w-full space-y-4">
                    
                    {/* ALL 3 MODES NOW PRESENT AND ACTIVE */}
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <button onClick={() => setPartySubMode('free_for_all')} className={cn("flex flex-col items-center p-3 rounded border transition-all text-center", partySubMode === 'free_for_all' ? "border-cyan-500 bg-cyan-500/20 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:text-fuchsia-500")}><Crosshair className="w-5 h-5 mb-2" /><span className="text-[9px] font-bold tracking-wider">FREE FOR ALL</span></button>
                      <button onClick={() => setPartySubMode('battle_royale')} className={cn("flex flex-col items-center p-3 rounded border transition-all text-center", partySubMode === 'battle_royale' ? "border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:text-fuchsia-500")}><Skull className="w-5 h-5 mb-2" /><span className="text-[9px] font-bold tracking-wider">BATTLE ROYALE</span></button>
                      
                      <button 
                        onClick={() => {
                          setPartySubMode('bounty_contracts');
                          setPartyWinCondition('points'); // Force Points mode
                        }} 
                        className={cn("flex flex-col items-center justify-center p-3 rounded border transition-all text-center relative overflow-hidden", partySubMode === 'bounty_contracts' ? "border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:text-fuchsia-500")}
                      >
                        {/* RED NOTIFICATION DOT FOR BOUNTY CONTRACTS */}
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <Target className="w-5 h-5 mb-2" />
                        <span className="text-[9px] font-bold tracking-wider text-center leading-tight">BOUNTY<br/>CONTRACTS</span>
                      </button>
                    </div>

                    {/* DYNAMIC SETTINGS MENU FOR MODES */}
                    {(partySubMode === 'free_for_all' || partySubMode === 'bounty_contracts') && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={cn("w-full p-3 border rounded space-y-3 overflow-hidden bg-black/40", partySubMode === 'bounty_contracts' ? "border-yellow-500/30" : "border-cyan-500/30")}>
                         
                         {partySubMode === 'free_for_all' && (
                           <div className="flex justify-between items-center"><span className="text-[10px] font-mono tracking-widest text-cyan-500">WIN CONDITION:</span><div className="flex gap-2"><button onClick={() => setPartyWinCondition('points')} className={cn("px-2 py-1 text-[10px] font-mono border rounded transition-all", partyWinCondition === 'points' ? "bg-cyan-500 text-black border-cyan-500" : "text-cyan-500/50 border-cyan-500/30")}>POINTS</button><button onClick={() => setPartyWinCondition('elimination')} className={cn("px-2 py-1 text-[10px] font-mono border rounded transition-all", partyWinCondition === 'elimination' ? "bg-cyan-500 text-black border-cyan-500" : "text-cyan-500/50 border-cyan-500/30")}>ELIMINATION</button></div></div>
                         )}

                         {(partyWinCondition === 'points' || partySubMode === 'bounty_contracts') && (
                           <div className="flex justify-between items-center">
                             <span className={cn("text-[10px] font-mono tracking-widest", partySubMode === 'bounty_contracts' ? "text-yellow-500" : "text-cyan-500")}>TARGET POINTS:</span>
                             <div className="flex gap-2">
                               {[10, 15, 20].map(pts => (
                                 <button key={pts} onClick={() => setPartyTargetPoints(pts)} className={cn("px-2 py-1 text-[10px] font-mono border rounded transition-all", partyTargetPoints === pts ? (partySubMode === 'bounty_contracts' ? "bg-yellow-500 text-black border-yellow-500" : "bg-cyan-500 text-black border-cyan-500") : (partySubMode === 'bounty_contracts' ? "text-yellow-500/50 border-yellow-500/30" : "text-cyan-500/50 border-cyan-500/30"))}>{pts}</button>
                               ))}
                             </div>
                           </div>
                         )}
                      </motion.div>
                    )}

                    <div className="w-full bg-black/40 border border-fuchsia-500/30 rounded p-3">
                       <div className="flex justify-between items-center mb-3 opacity-80 border-b border-fuchsia-500/20 pb-2">
                          <div className="text-[10px] font-mono text-fuchsia-400 text-left">CONFIGURE_ARSENAL.EXE</div>
                          <div className={cn("text-[10px] font-mono font-bold text-fuchsia-400")}>[{activePowerupsCount} EQUIPPED]</div>
                       </div>
                       <div className="grid grid-cols-1 gap-1">
                         <CyberToggle label="30s TIMER (BLITZ)" icon={<Timer className="w-3 h-3"/>} colorClass="text-orange-500" checked={customSettings.timer} onChange={(v: boolean) => togglePowerup('timer', v)} />
                         <div className="w-full h-px bg-fuchsia-500/10 my-1 mx-auto" />
                         <CyberToggle label={customSettings.timer ? "DDOS ATTACK (-20S)" : "FIREWALL (EXTRA TURN)"} icon={customSettings.timer ? <Timer className="w-3 h-3"/> : <Shield className="w-3 h-3"/>} colorClass={customSettings.timer ? "text-orange-500" : "text-yellow-400"} checked={customSettings.firewall} onChange={(v: boolean) => togglePowerup('firewall', v)} />
                         <CyberToggle label="BRUTEFORCE" icon={<Zap className="w-3 h-3"/>} colorClass="text-red-500" checked={customSettings.bruteforce} onChange={(v: boolean) => togglePowerup('bruteforce', v)} />
                         <CyberToggle label="CHANGE DIGIT" icon={<Edit2 className="w-3 h-3"/>} colorClass="text-blue-500" checked={customSettings.changeDigit} onChange={(v: boolean) => togglePowerup('changeDigit', v)} />
                         <CyberToggle label="SWAP DIGITS" icon={<Shuffle className="w-3 h-3"/>} colorClass="text-purple-500" checked={customSettings.swapDigits} onChange={(v: boolean) => togglePowerup('swapDigits', v)} />
                         <CyberToggle label="VIRUS (DELETE LOGS)" icon={<Bug className="w-3 h-3"/>} colorClass="text-green-500" checked={customSettings.virus} onChange={(v: boolean) => togglePowerup('virus', v)} />
                         <CyberToggle label="EMP (JAM SIGNAL)" icon={<Radio className="w-3 h-3"/>} colorClass="text-cyan-400" checked={customSettings.emp} onChange={(v: boolean) => togglePowerup('emp', v)} />
                         <CyberToggle label="SPYWARE (DATA LEAK)" icon={<Eye className="w-3 h-3"/>} colorClass="text-emerald-400" checked={customSettings.spyware} onChange={(v: boolean) => togglePowerup('spyware', v)} />
                         <CyberToggle label="HONEYPOT (PROXY LIE)" icon={<Ghost className="w-3 h-3"/>} colorClass="text-indigo-400" checked={customSettings.honeypot} onChange={(v: boolean) => togglePowerup('honeypot', v)} />
                         <CyberToggle label="PHISHING (STEAL)" icon={<Anchor className="w-3 h-3"/>} colorClass="text-pink-400" checked={customSettings.phishing} onChange={(v: boolean) => togglePowerup('phishing', v)} />
                         
                         {/* ADDED LOGIC BOMB HERE */}
                         <CyberToggle label="LOGIC BOMB (SILENCE)" icon={<Bomb className="w-3 h-3"/>} colorClass="text-zinc-400" checked={customSettings.logicBomb} onChange={(v: boolean) => togglePowerup('logicBomb', v)} />
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-fuchsia-500/30 bg-black/40 rounded">
                       <span className="text-[10px] font-mono tracking-widest text-fuchsia-500">MAX PLAYERS:</span>
                       <div className="flex gap-2">
                          {[3,4,5,6].map(num => (
                             <button key={num} onClick={() => setMaxPlayers(num)} className={cn("w-8 h-8 rounded border text-xs font-bold font-mono transition-all", maxPlayers === num ? "bg-fuchsia-500 text-black border-fuchsia-500" : "bg-transparent text-fuchsia-500/50 border-fuchsia-500/30 hover:border-fuchsia-500")}>{num}</button>
                          ))}
                       </div>
                    </div>

                    <button 
                      onClick={() => createPartyGame.mutate({ subMode: partySubMode, players: maxPlayers, settings: customSettings, winCond: partySubMode === 'battle_royale' ? 'elimination' : partyWinCondition, targetPts: partyTargetPoints })} 
                      disabled={createPartyGame.isPending} 
                      className="w-full group relative px-8 py-4 bg-fuchsia-500/10 border border-fuchsia-500 text-fuchsia-500 font-mono tracking-[0.3em] uppercase hover:bg-fuchsia-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {createPartyGame.isPending ? "INITIALIZING SQUAD..." : "CREATE PARTY ROOM"}
                    </button>
                  </div>
                  
                  <Button variant="ghost" onClick={() => setMenuView('main')} className="w-full h-10 text-fuchsia-500/60 hover:text-fuchsia-500 tracking-[0.2em] font-mono text-[10px] hover:bg-fuchsia-500/10 border border-transparent transition-all"><ArrowLeft className="mr-2 h-3 w-3" /> BACK TO MENU</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex-1 min-h-[2rem]"></div>
        <div className="w-full text-center font-mono text-[8px] opacity-10 uppercase tracking-[1em] pb-6 shrink-0 z-10">OS_CORE_VERSION_1.0.5_PARTY_PATCH</div>
      </div>
    </div>
  );
}
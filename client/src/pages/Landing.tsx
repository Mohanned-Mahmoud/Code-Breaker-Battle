import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  Loader2, Plus, Terminal, Lock, Info, Timer, Zap, Settings2, Shield, Edit2, Shuffle, Bug, Eye, Ghost, Radio, LogIn, User, Users, ArrowLeft, ArrowDown, ArrowRight, Crosshair, Skull, Crown, Anchor, Target, Bomb, Moon, Sun
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";

const CyberToggle = ({ label, icon, checked, onChange, colorClass }: any) => {
  const { theme } = useTheme();
  const isRamadan = theme === "ramadan";
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded cursor-pointer border border-transparent transition-all",
      isRamadan ? "hover:bg-amber-500/10 hover:border-amber-500/20" : "hover:bg-white/5 hover:border-primary/20"
    )} onClick={() => onChange(!checked)}>
      <span className={cn("text-[10px] font-bold tracking-widest flex items-center gap-2", checked ? colorClass : (isRamadan ? "text-amber-500/40" : "text-primary/40"))}>
        {icon} {label}
      </span>
      <div className={cn("w-8 h-4 rounded-full border transition-all relative", checked ? `bg-current ${colorClass} border-current` : (isRamadan ? "bg-black border-amber-500/40" : "bg-black border-primary/40"))}>
        <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", checked ? "bg-black right-0.5" : (isRamadan ? "bg-amber-500/40 left-0.5" : "bg-primary/40 left-0.5"))} />
      </div>
    </div>
  );
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isRamadan = theme === "ramadan";
  
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
      toast({ title: "MAXIMUM CAPACITY", description: "You can only equip up to 4 powerups in 1v1 matches.", variant: "destructive" });
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
    <div className={cn("h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-background custom-scrollbar relative", isRamadan && "font-ramadan")}>
      
      {/* THEME TOGGLE BUTTON & ARROW */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <motion.div 
          animate={{ x: [0, 8, 0] }} 
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className={cn("flex items-center gap-1.5 pointer-events-none", isRamadan ? "text-amber-500" : "text-primary")}
        >
          <span className={cn("text-[9px] sm:text-[10px] font-bold tracking-widest uppercase drop-shadow-md", isRamadan ? "font-ramadan" : "font-mono")}>
            {isRamadan ? "Cyber Mode" : "Ramadan Mode"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className={cn(
            "p-3 border rounded-full transition-all flex items-center justify-center",
            isRamadan 
              ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:bg-amber-500/20" 
              : "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,255,0,0.2)] hover:bg-primary/20"
          )}
        >
          {isRamadan ? <Moon className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
        </motion.button>
      </div>

      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isRamadan && (
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="islamic-geometry-v2" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                  <path d="M100 0 L130 70 L200 100 L130 130 L100 200 L70 130 L0 100 L70 70 Z" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
                  <circle cx="100" cy="100" r="40" stroke="#fbbf24" strokeWidth="0.2" strokeOpacity="0.5" />
                  <path d="M0 0 L200 200 M200 0 L0 200" stroke="#fbbf24" strokeWidth="0.1" strokeOpacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-geometry-v2)" />
            </svg>
          </div>
        )}
        {isRamadan ? (
          <div className="relative w-full h-full opacity-20">
            <svg viewBox="0 0 100 100" className="absolute top-10 right-10 w-32 h-32 text-amber-300 fill-current filter blur-[1px]">
              <path d="M50 20 A 30 30 0 1 0 80 50 A 25 25 0 1 1 50 20" />
            </svg>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-amber-200 rounded-full w-1 h-1"
                style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 2 + Math.random() * 3, repeat: Infinity }}
              />
            ))}
            <div className="absolute top-0 left-0 w-full flex justify-around">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-bounce" style={{ animationDuration: `${3 + i}s` }}>
                  <svg width="40" height="80" viewBox="0 0 40 80" fill="none">
                    <line x1="20" y1="0" x2="20" y2="40" stroke="#FBBF24" strokeWidth="2" />
                    <path d="M10 40 H30 L35 50 L20 75 L5 50 Z" fill="#FBBF24" fillOpacity="0.3" stroke="#FBBF24" strokeWidth="2" />
                    <circle cx="20" cy="55" r="5" fill="#FBBF24" className="animate-pulse" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute -bottom-10 -left-10 w-64 h-64 opacity-5 rotate-12">
            <svg viewBox="0 0 100 100" className="w-full h-full stroke-primary fill-none">
              <path d="M10 10 Q 50 10 50 50 T 90 90" strokeWidth="0.5" />
              <rect x="45" y="45" width="10" height="10" strokeWidth="0.5" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-h-full w-full flex flex-col items-center px-4 relative z-10">
        <div className="flex-1 min-h-[2rem]"></div>
        <div className="w-full max-w-2xl flex flex-col items-center shrink-0 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 w-full text-center mb-10">
            <div className={cn("flex items-center justify-center gap-2 opacity-40", isRamadan ? "text-amber-400" : "text-primary")}>
              {isRamadan ? <Moon className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
              <span className={cn("text-xs tracking-[0.5em] uppercase", isRamadan ? "font-ramadan" : "font-mono")}>
                {isRamadan ? "Lunar Neural Interface" : "Tactical Neural Interface"}
              </span>
            </div>
            <h1 className={cn(
              "text-6xl md:text-8xl font-black tracking-tighter uppercase text-center",
              isRamadan 
                ? "font-ramadan bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse" 
                : "font-mono text-primary glitch-effect"
            )} data-text="ENCRYPTION">
              ENCRYPTION<br/>
              <span className={isRamadan ? "text-amber-500/60" : "text-primary/40"}>WAR</span>
            </h1>
            <p className={cn("text-sm tracking-wide max-w-md mx-auto leading-relaxed hidden md:block", isRamadan ? "text-amber-400/60 font-ramadan" : "text-primary/40 font-mono")}>
              {isRamadan ? "The moon has risen. Objective: Decipher the golden patterns." : "Neural link established. Objective: Compromise opponent's master key."}
              <br/><span className="opacity-40 italic">Do not let your encryption fail.</span>
            </p>
          </motion.div>

          <div className="w-full max-w-sm mx-auto">
            <AnimatePresence mode="wait">
              
              {/* --- MAIN MENU --- */}
              {menuView === 'main' && (
                <motion.div key="main-menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="flex flex-col w-full space-y-4">
                  
                  {/* MAIN MENU CONTAINER (BOXED ONLY IN RAMADAN MODE) */}
                  <div className={cn(
                    "w-full transition-all duration-700 relative",
                    isRamadan ? "border-2 border-amber-500/40 bg-[#0B132B]/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_60px_rgba(251,191,36,0.2)] p-6 md:p-8 space-y-4" : "space-y-4"
                  )}>
                    {isRamadan && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-pulse" />
                    )}
                    
                    <button onClick={() => setMenuView('1v1')} className={cn(
                      "group relative w-full flex flex-col items-center justify-center p-6 border transition-all hover:scale-[1.02] active:scale-95",
                      isRamadan 
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_30px_rgba(251,191,36,0.1)] rounded-2xl" 
                        : "bg-primary/10 border-primary text-primary hover:bg-primary/20 shadow-[0_0_20px_rgba(0,255,0,0.1)]"
                    )}>
                       <User className="w-8 h-8 mb-3 opacity-80 group-hover:opacity-100 transition-opacity" />
                       <span className={cn("font-black tracking-[0.2em] text-xl uppercase", isRamadan ? "font-ramadan" : "font-mono")}>1V1 BATTLE</span>
                       <span className={cn("text-[10px] opacity-50 mt-1 tracking-widest uppercase", isRamadan ? "font-ramadan" : "font-mono")}>Tactical Duel</span>
                    </button>
                    
                    <button onClick={() => setMenuView('party')} className={cn(
                      "group relative w-full flex flex-col items-center justify-center p-6 border transition-all hover:scale-[1.02] active:scale-95",
                      isRamadan 
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] rounded-2xl" 
                        : "bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500/20 shadow-[0_0_20px_rgba(232,121,249,0.1)]"
                    )}>
                       <Users className="w-8 h-8 mb-3 opacity-80 group-hover:opacity-100 transition-opacity" />
                       <span className={cn("font-black tracking-[0.2em] text-xl uppercase", isRamadan ? "font-ramadan" : "font-mono")}>PARTY MODE</span>
                       <span className={cn("text-[10px] opacity-50 mt-1 tracking-widest uppercase", isRamadan ? "font-ramadan" : "font-mono")}>3 to 6 Players Chaos</span>
                       <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    </button>
                  </div>

                  {/* HOW TO PLAY & UPDATE NOTICE OUTSIDE THE BOX */}
                  <div className="relative w-full pt-4">
                    <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
                      <div className="bg-red-500 border border-red-400 text-white text-[9px] font-black px-3 py-1 rounded shadow-[0_0_15px_rgba(239,68,68,0.8)] tracking-widest uppercase flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        CHECK THE NEW UPDATE!
                      </div>
                      <ArrowDown className="w-4 h-4 text-red-500 mt-0.5" />
                    </motion.div>
                    <Link href="/how-to-play">
                      <Button variant="outline" className={cn(
                        "w-full h-12 tracking-[0.2em] text-xs transition-all",
                        isRamadan 
                          ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10 rounded-xl font-ramadan" 
                          : "neon-border text-primary hover:bg-primary/10 border-primary/40 font-mono"
                      )}>
                        <Info className="mr-2 h-3 w-3" /> HOW TO PLAY
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* --- 1V1 MENU --- */}
              {menuView === '1v1' && (
                <motion.div key="1v1-menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="flex flex-col items-center w-full space-y-6">
                  {/* JOIN SECTION */}
                    <div className={cn("flex w-full group relative transition-all", isRamadan ? "shadow-[0_0_30px_rgba(251,191,36,0.15)] rounded-xl overflow-hidden" : "shadow-[0_0_20px_rgba(0,255,0,0.05)] focus-within:shadow-[0_0_20px_rgba(0,255,0,0.15)]")}>
                      <div className={cn("flex items-center justify-center border border-r-0 px-3", isRamadan ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-primary/10 border-primary/40 text-primary")}><Terminal className="w-4 h-4 opacity-50" /></div>
                      <input type="text" inputMode="numeric" placeholder="ENTER 1V1 ROOM ID..." value={joinId} onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()} className={cn("flex-1 bg-black/60 border-y px-3 py-3 text-sm tracking-widest focus:outline-none focus:bg-black transition-colors placeholder:opacity-30 uppercase", isRamadan ? "border-amber-500/40 text-amber-400 font-ramadan" : "border-primary/40 text-primary font-mono")} />
                      <button onClick={handleJoinRoom} disabled={!joinId} className={cn("px-5 py-3 font-black tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border", isRamadan ? "bg-amber-500 text-black border-amber-500 hover:bg-amber-400 font-ramadan" : "bg-primary text-black border-primary hover:bg-primary/90 font-mono")}>JOIN</button>
                    </div>
                    
                    {/* SEPARATOR */}
                    <div className="flex items-center gap-4 w-full opacity-30">
                      <div className={cn("flex-1 h-px", isRamadan ? "bg-amber-500" : "bg-primary")}></div>
                      <span className={cn("text-[10px] tracking-widest", isRamadan ? "text-amber-500 font-ramadan" : "text-primary font-mono")}>OR HOST 1V1</span>
                      <div className={cn("flex-1 h-px", isRamadan ? "bg-amber-500" : "bg-primary")}></div>
                    </div>
                  {/* COMBINED CONTAINER (BOXED ONLY IN RAMADAN MODE) */}
                  <div className={cn(
                    "w-full flex flex-col transition-all duration-700 relative",
                    isRamadan ? "border-2 border-amber-500/40 bg-[#0B132B]/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_60px_rgba(251,191,36,0.2)] p-6 md:p-8 space-y-6" : "space-y-6"
                  )}>
                    {isRamadan && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-pulse" />
                    )}

                    
                    
                    {/* HOST OPTIONS */}
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {[
                          { id: 'normal', label: 'NORMAL', icon: <Terminal className="w-5 h-5 mb-2" />, color: isRamadan ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,255,0,0.2)]' },
                          { id: 'blitz', label: 'BLITZ (30s)', icon: <Timer className="w-5 h-5 mb-2" />, color: 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
                          { id: 'glitch', label: 'GLITCH', icon: <Zap className="w-5 h-5 mb-2" />, color: 'border-purple-500 bg-purple-500/20 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' },
                          { id: 'custom', label: 'CUSTOM', icon: <Settings2 className="w-5 h-5 mb-2" />, color: 'border-blue-500 bg-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' }
                        ].map(m => (
                          <button key={m.id} onClick={() => setMode(m.id as any)} className={cn("flex flex-col items-center p-3 border transition-all", theme === 'ramadan' ? 'rounded-xl' : 'rounded', mode === m.id ? m.color : (isRamadan ? "border-amber-500/20 text-amber-400/50" : "border-primary/20 text-primary/50 opacity-50 hover:opacity-100"))}>
                            {m.icon}<span className={cn("text-[10px] font-bold tracking-wider", isRamadan ? "font-ramadan" : "font-mono")}>{m.label}</span>
                          </button>
                        ))}
                      </div>
                      <AnimatePresence>
                        {mode === 'custom' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={cn("w-full bg-black/40 border p-3 overflow-hidden", isRamadan ? "border-amber-500/30 rounded-2xl" : "border-blue-500/30 rounded")}>
                             <div className={cn("flex justify-between items-center mb-3 opacity-80 border-b pb-2", isRamadan ? "border-amber-500/20" : "border-blue-500/20")}>
                                <div className={cn("text-[10px] text-left", isRamadan ? "font-ramadan text-amber-400" : "font-mono text-blue-400")}>{isRamadan ? "NIGHT_CHRONICLES.CONF" : "CONFIGURE_RULES.EXE"}</div>
                                <div className={cn("text-[10px] font-bold transition-colors", is1v1Overloaded ? "text-red-500 animate-pulse" : (isRamadan ? "text-amber-400" : "text-blue-400"))}>[{activePowerupsCount}/4 EQUIPPED]</div>
                             </div>
                             <div className="grid grid-cols-1 gap-1">
                               <CyberToggle label="30s TIMER (BLITZ)" icon={<Timer className="w-3 h-3"/>} colorClass="text-red-400" checked={customSettings.timer} onChange={(v: boolean) => togglePowerup('timer', v)} />
                               <div className={cn("w-full h-px my-1 mx-auto", isRamadan ? "bg-amber-500/10" : "bg-blue-500/10")} />
                               <CyberToggle label={customSettings.timer ? "DDOS ATTACK (-20S)" : "FIREWALL (EXTRA TURN)"} icon={customSettings.timer ? <Timer className="w-3 h-3"/> : <Shield className="w-3 h-3"/>} colorClass={customSettings.timer ? "text-orange-500" : "text-yellow-400"} checked={customSettings.firewall} onChange={(v: boolean) => togglePowerup('firewall', v)} />
                               <CyberToggle label="BRUTEFORCE" icon={<Zap className="w-3 h-3"/>} colorClass="text-red-500" checked={customSettings.bruteforce} onChange={(v: boolean) => togglePowerup('bruteforce', v)} />
                               <CyberToggle label="CHANGE DIGIT" icon={<Edit2 className="w-3 h-3"/>} colorClass="text-blue-500" checked={customSettings.changeDigit} onChange={(v: boolean) => togglePowerup('changeDigit', v)} />
                               <CyberToggle label="SWAP DIGITS" icon={<Shuffle className="w-3 h-3"/>} colorClass="text-purple-500" checked={customSettings.swapDigits} onChange={(v: boolean) => togglePowerup('swapDigits', v)} />
                               <CyberToggle label="VIRUS (DELETE LOGS)" icon={<Bug className="w-3 h-3"/>} colorClass="text-green-500" checked={customSettings.virus} onChange={(v: boolean) => togglePowerup('virus', v)} />
                               <CyberToggle label="EMP (JAM SIGNAL)" icon={<Radio className="w-3 h-3"/>} colorClass="text-cyan-400" checked={customSettings.emp} onChange={(v: boolean) => togglePowerup('emp', v)} />
                               <CyberToggle label="SPYWARE (DATA LEAK)" icon={<Eye className="w-3 h-3"/>} colorClass="text-emerald-400" checked={customSettings.spyware} onChange={(v: boolean) => togglePowerup('spyware', v)} />
                               <CyberToggle label="HONEYPOT (PROXY LIE)" icon={<Ghost className="w-3 h-3"/>} colorClass="text-indigo-400" checked={customSettings.honeypot} onChange={(v: boolean) => togglePowerup('honeypot', v)} />
                               <CyberToggle label="PHISHING (STEAL)" icon={<Anchor className="w-3 h-3"/>} colorClass="text-pink-400" checked={customSettings.phishing} onChange={(v: boolean) => togglePowerup('phishing', v)} />
                               <CyberToggle label="LOGIC BOMB (SILENCE)" icon={<Bomb className="w-3 h-3"/>} colorClass="text-zinc-400" checked={customSettings.logicBomb} onChange={(v: boolean) => togglePowerup('logicBomb', v)} />
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button onClick={() => createGame.mutate({ selectedMode: mode, settings: customSettings })} disabled={createGame.isPending || is1v1Overloaded} className={cn(
                          "w-full group relative px-8 py-4 border tracking-[0.3em] uppercase transition-all active:scale-95 disabled:cursor-not-allowed",
                          is1v1Overloaded ? "bg-red-900/20 border-red-500 text-red-500 opacity-80" : (isRamadan ? "bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 rounded-xl font-ramadan" : "bg-primary/5 border-primary text-primary hover:bg-primary/20 disabled:opacity-50 font-mono")
                      )}>
                        {createGame.isPending ? "INITIALIZING..." : is1v1Overloaded ? "SYSTEM OVERLOAD: MAX 4" : "CREATE 1V1 ROOM"}
                      </button>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setMenuView('main')} className={cn("w-full h-10 tracking-[0.2em] text-[10px] transition-all", isRamadan ? "text-amber-500/60 hover:text-amber-400 font-ramadan rounded-full" : "text-primary/60 hover:text-primary font-mono")}><ArrowLeft className="mr-2 h-3 w-3" /> BACK TO MENU</Button>
                </motion.div>
              )}

              {/* --- PARTY MENU --- */}
              {menuView === 'party' && (
                <motion.div key="party-menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="flex flex-col items-center w-full space-y-6">
                  
                  {/* COMBINED CONTAINER (BOXED ONLY IN RAMADAN MODE) */}
                  <div className={cn(
                    "w-full flex flex-col transition-all duration-700 relative space-y-6",
                    isRamadan ? "border-2 border-purple-500/40 bg-[#0B132B]/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_60px_rgba(168,85,247,0.2)] p-6 md:p-8" : ""
                  )}>
                    {isRamadan && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-pulse" />
                    )}

                    {/* JOIN SECTION */}
                    <div className={cn("flex w-full group relative transition-all", isRamadan ? "shadow-[0_0_30px_rgba(168,85,247,0.15)] rounded-xl overflow-hidden" : "shadow-[0_0_20px_rgba(232,121,249,0.05)] focus-within:shadow-[0_0_20px_rgba(232,121,249,0.15)]")}>
                      <div className={cn("flex items-center justify-center border border-r-0 px-3", isRamadan ? "bg-purple-500/10 border-purple-500/40 text-purple-400" : "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-500")}><Users className="w-4 h-4 opacity-50" /></div>
                      <input type="text" inputMode="numeric" placeholder="ENTER PARTY ROOM ID..." value={joinPartyId} onChange={(e) => setJoinPartyId(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleJoinPartyRoom()} className={cn("flex-1 bg-black/60 border-y px-3 py-3 text-sm tracking-widest focus:outline-none focus:bg-black transition-all placeholder:opacity-30 uppercase", isRamadan ? "border-purple-500/40 text-purple-400 font-ramadan" : "border-fuchsia-500/40 text-fuchsia-500 font-mono")} />
                      <button onClick={handleJoinPartyRoom} disabled={!joinPartyId} className={cn("px-5 py-3 font-black tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border", isRamadan ? "bg-purple-500 text-white border-purple-500 hover:bg-purple-400 font-ramadan" : "bg-fuchsia-500 text-black border-fuchsia-500 hover:bg-fuchsia-400 font-mono")}>JOIN</button>
                    </div>
                    
                    {/* SEPARATOR */}
                    <div className="flex items-center gap-4 w-full opacity-30">
                      <div className={cn("flex-1 h-px", isRamadan ? "bg-purple-500" : "bg-fuchsia-500")}></div>
                      <span className={cn("text-[10px] tracking-widest", isRamadan ? "text-purple-500 font-ramadan" : "text-fuchsia-500 font-mono")}>OR HOST PARTY</span>
                      <div className={cn("flex-1 h-px", isRamadan ? "bg-purple-500" : "bg-fuchsia-500")}></div>
                    </div>

                    {/* HOST OPTIONS */}
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {[
                          { id: 'free_for_all', label: 'FREE FOR ALL', icon: <Crosshair className="w-5 h-5 mb-2" />, color: isRamadan ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-cyan-500 bg-cyan-500/20 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' },
                          { id: 'battle_royale', label: 'BATTLE ROYALE', icon: <Skull className="w-5 h-5 mb-2" />, color: 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
                          { id: 'bounty_contracts', label: 'BOUNTY CONTRACTS', icon: <Target className="w-5 h-5 mb-2" />, color: 'border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]', badge: true }
                        ].map(m => (
                          <button key={m.id} onClick={() => { setPartySubMode(m.id as any); if(m.id === 'bounty_contracts') setPartyWinCondition('points'); }} className={cn("flex flex-col items-center justify-center p-3 border transition-all text-center relative overflow-hidden", theme === 'ramadan' ? 'rounded-xl' : 'rounded', partySubMode === m.id ? m.color : (isRamadan ? "border-amber-500/20 text-amber-400/50 hover:text-amber-400" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:text-fuchsia-500"))}>
                            {m.badge && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                            {m.icon}<span className={cn("text-[9px] font-bold tracking-wider uppercase leading-tight", isRamadan ? "font-ramadan" : "font-mono")}>{m.label.split(' ').map((w,i) => <span key={i}>{w}<br/></span>)}</span>
                          </button>
                        ))}
                      </div>

                      {(partySubMode === 'free_for_all' || partySubMode === 'bounty_contracts') && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={cn("w-full p-3 border space-y-3 overflow-hidden bg-black/40", theme === 'ramadan' ? 'rounded-2xl border-amber-500/30' : (partySubMode === 'bounty_contracts' ? "rounded border-yellow-500/30" : "rounded border-cyan-500/30"))}>
                           
                           {partySubMode === 'free_for_all' && (
                             <div className="flex justify-between items-center"><span className={cn("text-[10px] tracking-widest", isRamadan ? "font-ramadan text-amber-400" : "font-mono text-cyan-500")}>WIN CONDITION:</span><div className="flex gap-2">
                               {['points', 'elimination'].map(wc => (
                                 <button key={wc} onClick={() => setPartyWinCondition(wc as any)} className={cn("px-2 py-1 text-[10px] font-bold border transition-all", partyWinCondition === wc ? (wc === 'points' ? "border-cyan-500 text-cyan-500 bg-cyan-500/10" : "border-red-500 text-red-500 bg-red-500/10") : "border-transparent opacity-40")}>{wc.toUpperCase()}</button>
                               ))}
                             </div></div>
                           )}

                           {(partyWinCondition === 'points' || partySubMode === 'bounty_contracts') && (
                             <div className="flex justify-between items-center">
                               <span className={cn("text-[10px] tracking-widest", isRamadan ? "font-ramadan text-amber-400" : (partySubMode === 'bounty_contracts' ? "text-yellow-500 font-mono" : "text-cyan-500 font-mono"))}>TARGET POINTS:</span>
                               <div className="flex gap-2">
                                 {[10, 15, 20].map(pts => (
                                   <button key={pts} onClick={() => setPartyTargetPoints(pts)} className={cn("px-2 py-1 text-[10px] font-bold border transition-all", partyTargetPoints === pts ? (partySubMode === 'bounty_contracts' ? "bg-yellow-500 text-black border-yellow-500" : "bg-cyan-500 text-black border-cyan-500") : "border-transparent opacity-40")}>{pts}</button>
                                 ))}
                               </div>
                             </div>
                           )}
                        </motion.div>
                      )}

                      <div className={cn("w-full bg-black/40 border p-3", isRamadan ? 'rounded-2xl border-amber-500/30' : 'rounded border-fuchsia-500/30')}>
                         <div className={cn("flex justify-between items-center mb-3 opacity-80 border-b pb-2", isRamadan ? "border-amber-500/20" : "border-fuchsia-500/20")}>
                            <div className={cn("text-[10px] text-left", isRamadan ? "font-ramadan text-amber-400" : "font-mono text-fuchsia-400")}>{isRamadan ? "NIGHT_ARSENAL.CONF" : "CONFIGURE_ARSENAL.EXE"}</div>
                            <div className={cn("text-[10px] font-bold", isRamadan ? "text-amber-400" : "text-fuchsia-400")}>[{activePowerupsCount} EQUIPPED]</div>
                         </div>
                         <div className="grid grid-cols-1 gap-1">
                           <CyberToggle label="30s TIMER (BLITZ)" icon={<Timer className="w-3 h-3"/>} colorClass="text-orange-500" checked={customSettings.timer} onChange={(v: boolean) => togglePowerup('timer', v)} />
                           <div className={cn("w-full h-px my-1 mx-auto", isRamadan ? "bg-amber-500/10" : "bg-fuchsia-500/10")} />
                           <CyberToggle label={customSettings.timer ? "DDOS ATTACK (-20S)" : "FIREWALL (EXTRA TURN)"} icon={customSettings.timer ? <Timer className="w-3 h-3"/> : <Shield className="w-3 h-3"/>} colorClass={customSettings.timer ? "text-orange-500" : "text-yellow-400"} checked={customSettings.firewall} onChange={(v: boolean) => togglePowerup('firewall', v)} />
                           <CyberToggle label="BRUTEFORCE" icon={<Zap className="w-3 h-3"/>} colorClass="text-red-500" checked={customSettings.bruteforce} onChange={(v: boolean) => togglePowerup('bruteforce', v)} />
                           <CyberToggle label="CHANGE DIGIT" icon={<Edit2 className="w-3 h-3"/>} colorClass="text-blue-500" checked={customSettings.changeDigit} onChange={(v: boolean) => togglePowerup('changeDigit', v)} />
                           <CyberToggle label="SWAP DIGITS" icon={<Shuffle className="w-3 h-3"/>} colorClass="text-purple-500" checked={customSettings.swapDigits} onChange={(v: boolean) => togglePowerup('swapDigits', v)} />
                           <CyberToggle label="VIRUS (DELETE LOGS)" icon={<Bug className="w-3 h-3"/>} colorClass="text-green-500" checked={customSettings.virus} onChange={(v: boolean) => togglePowerup('virus', v)} />
                           <CyberToggle label="EMP (JAM SIGNAL)" icon={<Radio className="w-3 h-3"/>} colorClass="text-cyan-400" checked={customSettings.emp} onChange={(v: boolean) => togglePowerup('emp', v)} />
                           <CyberToggle label="SPYWARE (DATA LEAK)" icon={<Eye className="w-3 h-3"/>} colorClass="text-emerald-400" checked={customSettings.spyware} onChange={(v: boolean) => togglePowerup('spyware', v)} />
                           <CyberToggle label="HONEYPOT (PROXY LIE)" icon={<Ghost className="w-3 h-3"/>} colorClass="text-indigo-400" checked={customSettings.honeypot} onChange={(v: boolean) => togglePowerup('honeypot', v)} />
                           <CyberToggle label="PHISHING (STEAL)" icon={<Anchor className="w-3 h-3"/>} colorClass="text-pink-400" checked={customSettings.phishing} onChange={(v: boolean) => togglePowerup('phishing', v)} />
                           <CyberToggle label="LOGIC BOMB (SILENCE)" icon={<Bomb className="w-3 h-3"/>} colorClass="text-zinc-400" checked={customSettings.logicBomb} onChange={(v: boolean) => togglePowerup('logicBomb', v)} />
                         </div>
                      </div>

                      <div className={cn("flex items-center justify-between p-3 border bg-black/40", isRamadan ? "border-amber-500/30 rounded-2xl" : "border-fuchsia-500/30 rounded")}>
                         <span className={cn("text-[10px] tracking-widest", isRamadan ? "font-ramadan text-amber-400" : "font-mono text-fuchsia-500")}>MAX PLAYERS:</span>
                         <div className="flex gap-2">
                            {[3, 4, 5, 6].map(num => (
                               <button key={num} onClick={() => setMaxPlayers(num)} className={cn("w-8 h-8 border text-xs font-bold transition-all", isRamadan ? "rounded-full" : "rounded", maxPlayers === num ? (isRamadan ? "bg-amber-500 text-black border-amber-500" : "bg-fuchsia-500 text-black border-fuchsia-500") : (isRamadan ? "bg-transparent text-amber-500/50 border-amber-500/30 hover:border-amber-500" : "bg-transparent text-fuchsia-500/50 border-fuchsia-500/30 hover:border-fuchsia-500"))}>{num}</button>
                            ))}
                         </div>
                      </div>

                      <button onClick={() => createPartyGame.mutate({ subMode: partySubMode, players: maxPlayers, settings: customSettings, winCond: partySubMode === 'battle_royale' ? 'elimination' : partyWinCondition, targetPts: partyTargetPoints })} disabled={createPartyGame.isPending} className={cn("w-full group relative px-8 py-4 border tracking-[0.3em] uppercase transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed", isRamadan ? "bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20 rounded-xl font-ramadan shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "bg-fuchsia-500/5 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500/20 font-mono")}>
                        {createPartyGame.isPending ? "GENERATING..." : `HOST ${partySubMode.replace(/_/g, ' ')}`}
                      </button>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setMenuView('main')} className={cn("w-full h-10 tracking-[0.2em] text-[10px] transition-all", isRamadan ? "text-purple-500/60 hover:text-purple-400 font-ramadan rounded-full" : "text-fuchsia-500/60 hover:text-fuchsia-500 font-mono")}><ArrowLeft className="mr-2 h-3 w-3" /> BACK TO MENU</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex-1 min-h-[2rem]"></div>
        <div className={cn("w-full text-center text-[8px] opacity-10 uppercase tracking-[1em] pb-6 shrink-0 z-10", isRamadan ? "font-ramadan" : "font-mono")}>OS_CORE_VERSION_1.0.5_PARTY_PATCH</div>
      </div>
    </div>
  );
}
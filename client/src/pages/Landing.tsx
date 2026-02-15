import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  Loader2, Plus, Terminal, Lock, Info, Timer, Zap, Settings2, Shield, Edit2, Shuffle, Bug, Eye, Ghost, Radio, LogIn
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
  const [mode, setMode] = useState<'normal' | 'blitz' | 'glitch' | 'custom'>('normal');
  const [joinId, setJoinId] = useState(""); 
  
  const [customSettings, setCustomSettings] = useState({
      timer: false, firewall: true, virus: false, bruteforce: true, changeDigit: true, swapDigits: true,
      emp: false, spyware: false, honeypot: false
  });

  const activePowerupsCount = [
    customSettings.firewall, customSettings.virus, customSettings.bruteforce, customSettings.changeDigit, customSettings.swapDigits,
    customSettings.emp, customSettings.spyware, customSettings.honeypot
  ].filter(Boolean).length;

  const togglePowerup = (key: keyof typeof customSettings, value: boolean) => {
    if (value && activePowerupsCount >= 4 && key !== 'timer') {
      toast({ 
          title: "SYSTEM OVERLOAD", 
          description: "You can only equip a maximum of 4 powerups.", 
          variant: "destructive" 
      });
      return;
    }
    setCustomSettings(p => ({ ...p, [key]: value }));
  };

  const createGame = useMutation({
    mutationFn: async ({ selectedMode, settings }: { selectedMode: string, settings?: any }) => {
      const res = await fetch(api.games.create.path, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode, customSettings: settings })
      });
      return await res.json();
    },
    onSuccess: (data) => { setLocation(`/game/${data.id}`); }
  });

  const handleJoinRoom = () => {
    if (!joinId.trim()) return;
    setLocation(`/game/${joinId}`);
  };

  return (
    /* 1. الحاوية الرئيسية تم تحديدها لتقوم بعمل Scroll داخلي سلس */
    <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-background custom-scrollbar relative">
      
      {/* Background SVG - تم جعله Fixed ليظل ثابتاً في زاوية الشاشة أثناء النزول والصعود */}
      <div className="fixed -bottom-10 -left-10 w-64 h-64 opacity-5 pointer-events-none rotate-12 z-0">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-primary fill-none"><path d="M10 10 Q 50 10 50 50 T 90 90" strokeWidth="0.5" /><rect x="45" y="45" width="10" height="10" strokeWidth="0.5" /></svg>
      </div>

      {/* 2. الحاوية الداخلية (min-h-full) لتوسيط المحتوى بذكاء بدون قص الأطراف */}
      <div className="min-h-full flex flex-col items-center justify-center py-12 px-4 relative z-10 w-full">
        
        <div className="text-center space-y-10 max-w-2xl w-full flex flex-col items-center">
          
          {/* HEADER */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 w-full">
            <div className="flex items-center justify-center gap-2 text-primary opacity-40"><Terminal className="w-4 h-4" /><span className="text-xs font-mono tracking-[0.5em] uppercase">Tactical Neural Interface</span></div>
            <h1 className="text-6xl md:text-8xl font-black font-mono tracking-tighter text-primary glitch-effect uppercase" data-text="ENCRYPTION">ENCRYPTION<br/><span className="text-primary/40">WAR</span></h1>
            <p className="text-primary/40 font-mono text-sm tracking-wide max-w-md mx-auto leading-relaxed hidden md:block">Neural link established. Objective: Compromise opponent's 4-digit master key. <br/><span className="text-primary/20 italic">Do not let your encryption fail.</span></p>
          </motion.div>

          {/* CONTROLS (Join & Create) */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col items-center w-full max-w-sm mx-auto space-y-6">
            
            {/* JOIN ROOM SECTION */}
            <div className="flex w-full group relative shadow-[0_0_20px_rgba(0,255,0,0.05)] focus-within:shadow-[0_0_20px_rgba(0,255,0,0.15)] transition-all">
              <div className="flex items-center justify-center bg-primary/10 border border-primary/40 border-r-0 px-3 text-primary">
                 <Terminal className="w-4 h-4 opacity-50" />
              </div>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="ENTER ROOM ID..." 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))} 
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="flex-1 bg-black/60 border-y border-primary/40 text-primary px-3 py-3 font-mono text-sm tracking-widest focus:outline-none focus:bg-black transition-colors placeholder:text-primary/30 uppercase"
              />
              <button 
                onClick={handleJoinRoom}
                disabled={!joinId}
                className="px-5 py-3 bg-primary text-black font-black font-mono tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-primary"
              >
                JOIN <LogIn className="w-4 h-4 hidden sm:block" />
              </button>
            </div>

            <div className="flex items-center gap-4 w-full opacity-30">
              <div className="flex-1 h-px bg-primary"></div>
              <span className="text-[10px] font-mono tracking-widest">OR HOST NEW</span>
              <div className="flex-1 h-px bg-primary"></div>
            </div>

            {/* CREATE ROOM SECTION */}
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
                        <div className={cn("text-[10px] font-mono font-bold", activePowerupsCount === 4 ? "text-red-400 animate-pulse" : "text-blue-400")}>
                          [{activePowerupsCount}/4 EQUIPPED]
                        </div>
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
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button onClick={() => createGame.mutate({ selectedMode: mode, settings: customSettings })} disabled={createGame.isPending} className="w-full group relative px-8 py-4 bg-primary/5 border border-primary text-primary font-mono tracking-[0.3em] uppercase hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50">
                <div className="absolute inset-0 border border-primary opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                {createGame.isPending ? <span className="flex items-center justify-center gap-3"><Loader2 className="w-4 h-4 animate-spin" /> INITIALIZING...</span> : <span className="flex items-center justify-center gap-3"><Plus className="w-4 h-4" /> CREATE PRIVATE ROOM</span>}
              </button>
            </div>
            
            <Link href="/how-to-play">
              <Button variant="outline" className="w-full h-12 neon-border text-primary hover:bg-primary/10 tracking-[0.2em] font-mono border-primary/40 text-xs mt-2">
                <Info className="mr-2 h-3 w-3" /> HOW TO PLAY
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-2 opacity-20 text-[10px] font-mono tracking-widest uppercase mt-4">
              <Lock className="w-3 h-3" /><span>End-to-End Encrypted Tunnel</span>
            </div>
          </motion.div>

        </div>

        {/* Footer */}
        <div className="mt-12 w-full text-center font-mono text-[8px] opacity-10 uppercase tracking-[1em]">
          OS_CORE_VERSION_1.0.4_STABLE
        </div>

      </div>
    </div>
  );
}
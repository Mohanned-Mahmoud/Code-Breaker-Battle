import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Shield, Zap, Terminal, ArrowLeft, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- STATIC DATA (Moved outside to prevent re-renders) ---
const TUTORIAL_LOGS = [
    "SYSTEM_BOOT_SEQUENCE_INITIATED...",
    "LOADING_TUTORIAL_MODULES...",
    "MODULE_LOADED: DECRYPTION_LOGIC",
    "MODULE_LOADED: BATTLE_MECHANICS",
    "WELCOME_RECRUIT. PREPARE_FOR_BRIEFING.",
    "OBJECTIVE: GUESS THE 4-DIGIT ENEMY CODE.",
    "TIP: USE LOGIC, NOT LUCK.",
    "STATUS: WAITING_FOR_INPUT..."
];

// --- COMPONENTS ---

const MockDigit = ({ val, status }: { val: string, status: 'hit' | 'close' | 'none' }) => (
  <div className={cn(
    "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl font-bold rounded-sm border-2 transition-all duration-500",
    status === 'hit' ? "border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] bg-green-500/10 scale-110" :
    status === 'close' ? "border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] bg-yellow-500/10" :
    "border-primary/30 text-primary/30 bg-black/50"
  )}>
    {val}
  </div>
);

const TypewriterLog = ({ logs }: { logs: string[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);

    useEffect(() => {
        // Reset logs when the source changes
        setDisplayedLogs([]); 
        let currentIndex = 0;
        
        const interval = setInterval(() => {
            if (currentIndex < logs.length) {
                setDisplayedLogs(prev => [...prev, logs[currentIndex]]);
                currentIndex++;
                
                // Auto scroll
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            } else {
                clearInterval(interval);
            }
        }, 800);
        
        return () => clearInterval(interval);
    }, [logs]);

    return (
        <div ref={scrollRef} className="font-mono text-xs md:text-sm flex-1 min-h-0 overflow-y-auto p-4 bg-black/60 border border-primary/20 rounded-sm custom-scrollbar space-y-2 h-full">
            {displayedLogs.map((log, i) => {
                // FIX: Added safety check (log || "") to prevent crash
                const safeLog = log || ""; 
                return (
                    <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="opacity-40 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span className={safeLog.includes("ERROR") ? "text-red-500" : safeLog.includes("SUCCESS") ? "text-green-500" : "text-primary/70"}>
                            {">"} {safeLog}
                        </span>
                    </div>
                );
            })}
             <div className="sticky bottom-0 left-0 animate-pulse w-2 h-4 bg-primary/50 mt-2" />
        </div>
    );
};

export default function HowToPlay() {
  const [, setLocation] = useLocation();
  const [demoInput, setDemoInput] = useState("");
  const [demoResult, setDemoResult] = useState<{hits: number, blips: number} | null>(null);

  // Simulation Logic
  const TARGET_CODE = "7392"; 

  const handleSimulate = () => {
    if (demoInput.length !== 4) return;
    
    let hits = 0;
    let blips = 0;
    const secretArr = TARGET_CODE.split('');
    const guessArr = demoInput.split('');
    const secretUsed = [false, false, false, false];
    const guessUsed = [false, false, false, false];

    // Hits
    for (let i = 0; i < 4; i++) {
      if (guessArr[i] === secretArr[i]) {
        hits++;
        secretUsed[i] = true;
        guessUsed[i] = true;
      }
    }
    // Blips (Close)
    for (let i = 0; i < 4; i++) {
      if (!guessUsed[i]) {
        for (let j = 0; j < 4; j++) {
          if (!secretUsed[j] && guessArr[i] === secretArr[j]) {
            blips++;
            secretUsed[j] = true;
            break;
          }
        }
      }
    }
    setDemoResult({ hits, blips });
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col relative bg-background text-primary selection:bg-primary/30">
      
      {/* Background Grid Animation */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4 border-b border-primary/20 bg-black/80 backdrop-blur">
          <div className="flex items-center gap-4">
             <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-cyan-400" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-5 w-5" />
             </Button>
            <div>
              <h2 className="text-xl font-black tracking-tighter glitch-effect">TRAINING_SIM</h2>
              <p className="text-[10px] opacity-50 font-mono tracking-widest">V.2.0 // INTERACTIVE</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold tracking-widest">ONLINE</span>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden p-4 grid grid-cols-1 md:grid-cols-12 gap-6 z-10 max-w-7xl mx-auto w-full">
        
        {/* LEFT COLUMN: CONCEPTS (5 Cols) */}
        <div className="md:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* CARD 1: THE LOGIC */}
            <div className="bg-black/40 border border-primary/20 p-5 rounded-lg space-y-4 hover:border-primary/50 transition-colors group">
                <h3 className="flex items-center gap-2 font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                    <Terminal className="w-5 h-5" /> THE LOGIC
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-900/10 border border-green-500/20 rounded-md">
                        <MockDigit val="7" status="hit" />
                        <div>
                            <span className="text-green-400 font-bold block text-sm">HIT</span>
                            <span className="text-xs opacity-70">Right Number, Right Place.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-md">
                        <MockDigit val="3" status="close" />
                        <div>
                            <span className="text-yellow-400 font-bold block text-sm">CLOSE</span>
                            <span className="text-xs opacity-70">Right Number, Wrong Place.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD 2: POWERUPS */}
            <div className="bg-black/40 border border-primary/20 p-5 rounded-lg space-y-4 hover:border-primary/50 transition-colors">
                 <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                    <Zap className="w-5 h-5 text-yellow-500" /> ARSENAL
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary/5 rounded border border-primary/10 text-center">
                        <Shield className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                        <div className="text-xs font-bold text-white mb-1">FIREWALL</div>
                        <p className="text-[10px] opacity-60 leading-tight">Block turn switch. Play again instantly.</p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded border border-primary/10 text-center">
                        <Zap className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        <div className="text-xs font-bold text-white mb-1">BRUTEFORCE</div>
                        <p className="text-[10px] opacity-60 leading-tight">Reveal the 1st digit of enemy code.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* MIDDLE COLUMN: INTERACTIVE SIMULATOR (4 Cols) */}
        <div className="md:col-span-4 flex flex-col bg-black/60 border border-primary/30 rounded-lg p-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,255,0,0.05)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <div className="text-center mb-6">
                <div className="inline-block px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[10px] tracking-widest font-bold mb-2 text-cyan-400">
                    INTERACTIVE DEMO
                </div>
                <h3 className="text-xl font-bold text-white">CRACK THE CODE</h3>
                <p className="text-xs opacity-50 mt-1">Try to guess the secret code: <span className="text-white font-bold tracking-widest">{TARGET_CODE}</span></p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {/* Visual Feedback Display */}
                <div className="flex gap-2">
                    {[0, 1, 2, 3].map((i) => {
                        let status: 'hit' | 'close' | 'none' = 'none';
                        // Visual logic for demo purposes only
                        if (demoResult && demoInput[i]) {
                             if (demoInput[i] === TARGET_CODE[i]) status = 'hit';
                             else if (TARGET_CODE.includes(demoInput[i])) status = 'close';
                        }
                        
                        return (
                            <MockDigit key={i} val={demoInput[i] || ""} status={status} />
                        );
                    })}
                </div>

                {/* Input Area */}
                <div className="w-full max-w-[200px]">
                    <input 
                        type="text" 
                        maxLength={4}
                        value={demoInput}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setDemoInput(val);
                            setDemoResult(null); // Reset result on typing
                        }}
                        placeholder="TYPE 4 DIGITS"
                        className="w-full bg-black border-b-2 border-primary/50 text-center text-xl font-mono py-2 focus:outline-none focus:border-primary text-white placeholder:text-primary/20 tracking-widest"
                    />
                </div>

                <div className="flex gap-2 w-full">
                     <Button 
                        className="flex-1 neon-border"
                        disabled={demoInput.length < 4}
                        onClick={handleSimulate}
                    >
                        <Play className="w-4 h-4 mr-2" /> SIMULATE
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { setDemoInput(""); setDemoResult(null); }}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                {/* Result Message */}
                {demoResult && (
                    <div className="w-full p-3 bg-primary/10 border border-primary/30 rounded animate-in zoom-in duration-300 text-center">
                        <div className="text-xs font-mono opacity-70 mb-1">SCAN RESULTS:</div>
                        <div className="flex justify-center gap-4 font-bold text-lg">
                            <span className="text-green-400">{demoResult.hits} HITS</span>
                            <span className="text-yellow-400">{demoResult.blips} CLOSE</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: TERMINAL (3 Cols) */}
        <div className="md:col-span-3 h-[300px] md:h-auto flex flex-col">
            <div className="bg-black border border-primary/20 border-b-0 rounded-t-lg p-2 flex items-center gap-2">
                <Terminal className="w-3 h-3 text-primary/50" />
                <span className="text-[10px] font-mono opacity-50 tracking-widest">SYSTEM_LOGS</span>
            </div>
            <div className="flex-1 bg-black/80 rounded-b-lg overflow-hidden border border-primary/20">
                <TypewriterLog logs={TUTORIAL_LOGS} />
            </div>
             <Button 
                className="w-full mt-4 h-12 neon-border tracking-widest font-black bg-primary text-black hover:bg-primary/90"
                onClick={() => setLocation("/")}
            >
                START MISSION
            </Button>
        </div>

      </div>
    </div>
  );
}
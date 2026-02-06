import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Share2, Lock, Shield, Zap, Terminal, Info
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

// --- TERMINAL COMPONENT ---
function TerminalLog({ logs }: { logs: GameLog[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  return (
    <div 
      ref={scrollRef} 
      // FIX: flex-1 ensures it fills the parent, min-h-0 allows shrinking, overflow-y-auto enables scroll
      className="font-mono text-xs md:text-sm flex-1 min-h-0 overflow-y-auto p-4 bg-black/60 border border-primary/20 rounded-sm custom-scrollbar relative"
    >
      <div className="flex flex-col-reverse space-y-reverse space-y-2">
        <AnimatePresence initial={false}>
          {logs.slice().reverse().map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2"
            >
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
  value: string, 
  onChange: (val: string) => void, 
  disabled?: boolean,
  variant?: 'default' | 'p1' | 'p2'
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { playTyping } = useSFX();

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newVal = value.split('');
    newVal[index] = val.slice(-1);
    const result = newVal.join('');
    onChange(result);
    if (val && index < 3) inputs.current[index + 1]?.focus();
    playTyping();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "w-12 h-12 md:w-16 md:h-16 bg-black text-center text-2xl font-bold rounded-sm border-2 transition-all outline-none",
            "neon-border focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
            variant === 'p1' ? 'border-cyan-500 text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 
            variant === 'p2' ? 'border-fuchsia-500 text-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.5)]' : 
            'border-primary text-primary'
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

  const [myRole, setMyRole] = useState<'p1' | 'p2' | null>(() => {
    const saved = localStorage.getItem(`role_${id}`);
    return (saved === 'p1' || saved === 'p2') ? saved : null;
  });

  const { data: game, isLoading, error } = useQuery<GameStateResponse>({
    queryKey: ['game', id],
    queryFn: () => fetch(`/api/games/${id}`).then(res => res.json()),
    refetchInterval: 1000
  });

  const { data: logs = [] } = useQuery<GameLog[]>({
    queryKey: ['logs', id],
    queryFn: () => fetch(`/api/games/${id}/logs`).then(res => res.json()),
    refetchInterval: 1000
  });

  const setupMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/games/${id}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: (data, variables) => {
      const role = variables.player;
      setMyRole(role);
      localStorage.setItem(`role_${id}`, role);
      setSetupCode("");
      setShowTransition(true);
      setTimeout(() => setShowTransition(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['game', id] });
    }
  });

  const guessMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/games/${id}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: () => {
      setGuessVal("");
      playBeep();
      queryClient.invalidateQueries({ queryKey: ['game', id] });
      queryClient.invalidateQueries({ queryKey: ['logs', id] });
    }
  });

  const powerupMutation = useMutation({
    mutationFn: (type: 'firewall' | 'bruteforce') => fetch(`/api/games/${id}/powerup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: myRole, type })
    }).then(res => res.json()),
    onSuccess: () => {
        toast({ title: "SYSTEM UPDATE", description: "Powerup Activated Successfully" });
        queryClient.invalidateQueries({ queryKey: ['game', id] });
    }
  });

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin" /></div>;
  if (error || !game) return <div className="h-screen flex items-center justify-center bg-background">Connection Error</div>;

  if (game.status === 'finished') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-black glitch-effect uppercase text-center">
            <span className={game.winner === 'p1' ? "text-cyan-500" : "text-fuchsia-500"}>
                P{game.winner === 'p1' ? '01' : '02'}
            </span> VICTORIOUS
        </h1>
        <Button variant="outline" className="mt-8 neon-border" onClick={() => setLocation("/")}>INITIATE NEW SEQUENCE</Button>
      </div>
    );
  }

  // --- SETUP PHASE ---
  if (!game.p1Setup || !game.p2Setup) {
    const targetRole = !game.p1Setup ? 'p1' : 'p2';
    
    if (myRole && myRole !== targetRole) {
       return (
         <div className="h-screen flex flex-col items-center justify-center bg-background p-4 text-center space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h2 className="text-xl font-mono tracking-widest text-primary">WAITING FOR OPPONENT...</h2>
            
            <div className="p-4 border border-primary/20 rounded bg-primary/5">
                <p className="text-xs opacity-50 mb-2">SEND THIS UPLINK TO PLAYER 2:</p>
                <div className="flex gap-2">
                    <code className="bg-black p-2 rounded text-xs select-all">{window.location.href}</code>
                    <Button size="icon" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Copied!" });
                    }}>
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
         </div>
       );
    }

    if (showTransition) return (
      <div className="h-screen flex flex-col items-center justify-center bg-black">
        <h1 className="text-3xl font-bold tracking-widest">ENCRYPTION LOCKED</h1>
        <p className="text-primary/40 font-mono">System ready. Prepare for battle.</p>
      </div>
    );

    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 bg-black/40 border border-primary/30 rounded-sm space-y-10">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-primary opacity-50" />
            <h1 className="text-2xl font-bold tracking-widest uppercase">
                PLAYER <span className={targetRole === 'p1' ? "text-cyan-500" : "text-fuchsia-500"}>{targetRole === 'p1' ? '01' : '02'}</span>
            </h1>
            <p className="text-xs font-mono opacity-50">DEFINE YOUR 4-DIGIT MASTER KEY</p>
          </div>
          <DigitInput value={setupCode} onChange={setSetupCode} variant={targetRole} />
          <Button 
            className="w-full h-12 neon-border bg-primary/10 hover:bg-primary/20"
            disabled={setupCode.length < 4 || setupMutation.isPending}
            onClick={() => setupMutation.mutate({ player: targetRole, code: setupCode })}
          >
            {setupMutation.isPending ? "ENCRYPTING..." : "INITIALIZE KEY"}
          </Button>
        </div>
      </div>
    );
  }

  // --- BATTLE PHASE ---
  const activeP = game.turn;
  const isMyTurn = myRole === activeP;
  const p1Powerups = { firewall: game.p1FirewallUsed ?? false, bruteforce: game.p1BruteforceUsed ?? false };
  const p2Powerups = { firewall: game.p2FirewallUsed ?? false, bruteforce: game.p2BruteforceUsed ?? false };
  const myPowerups = myRole === 'p1' ? p1Powerups : p2Powerups;

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row relative">
      <div className={cn(
          "absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none z-0 transition-colors duration-500",
          activeP === 'p1' ? 'stroke-cyan-500' : 'stroke-fuchsia-500'
      )}>
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none">
          <path d="M20 20 L80 80 M80 20 L20 80" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="40" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="flex-1 flex flex-col p-4 space-y-4 z-10">
        <div className="flex justify-between items-center border-b border-primary/20 pb-4">
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/70 hover:text-primary">
                  <Info className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="border-primary/50 bg-black/90 text-primary">
                <DialogHeader>
                  <DialogTitle className="text-xl tracking-widest uppercase mb-4 border-b border-primary/30 pb-2">
                    Battle Manual
                  </DialogTitle>
                  <DialogDescription className="space-y-4 text-left pt-2">
                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" /> MISSION
                      </h3>
                      <p className="text-xs font-mono opacity-80">
                        Crack the opponent's 4-digit code before they crack yours.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-yellow-500" /> FEEDBACK
                      </h3>
                      <ul className="text-xs font-mono space-y-1 opacity-80 list-disc list-inside">
                        <li><span className="text-green-500 font-bold">HITS:</span> Correct number in Correct place.</li>
                        <li><span className="text-yellow-500 font-bold">CLOSE:</span> Correct number but Wrong place.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-500" /> POWERUPS
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono opacity-80">
                        <div className="border border-primary/20 p-2 rounded">
                          <strong className="text-yellow-500 block mb-1">🛡️ FIREWALL</strong>
                          Blocks turn switch. Gives you 1 extra turn immediately.
                        </div>
                        <div className="border border-primary/20 p-2 rounded">
                          <strong className="text-red-500 block mb-1">⚡ BRUTEFORCE</strong>
                          Reveals the 1st digit of enemy code permanently.
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <div className="space-y-1">
              <h2 className="text-xs opacity-50 font-mono tracking-widest">SESSION</h2>
              <p className="text-lg font-bold tracking-tighter">{id}</p>
            </div>
          </div>

          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <div className={cn(
              "px-4 py-1 border rounded-full text-[10px] font-bold tracking-widest transition-all",
              isMyTurn ? "border-primary text-primary animate-pulse" : "border-primary/30 text-primary/30"
            )}>
              {isMyTurn ? "YOUR TURN" : `WAITING...`}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/40 hover:text-primary" 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Uplink copied" });
                    }}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-none md:grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col space-y-4 md:space-y-6 justify-center items-center bg-black/20 p-4 md:p-8 border border-primary/10 rounded-sm relative">
            <div className="absolute top-2 left-2 text-[10px] font-mono opacity-30">
              IDENTITY: <span className={myRole === 'p1' ? "text-cyan-500" : "text-fuchsia-500"}>{myRole === 'p1' ? 'PLAYER 01' : 'PLAYER 02'}</span>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-sm font-mono opacity-40 uppercase tracking-[0.3em]">Neural Input Required</h3>
              <p className="text-xs opacity-20 italic">"Guess the enemy encryption to compromise system."</p>
            </div>
            
            <DigitInput value={guessVal} onChange={setGuessVal} disabled={!isMyTurn} variant={activeP as 'p1' | 'p2'} />

            <div className="flex gap-4 w-full max-w-xs">
                <Button 
                    variant="outline" 
                    className="flex-1 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 text-[10px]"
                    disabled={!isMyTurn || myPowerups.firewall || powerupMutation.isPending}
                    onClick={() => powerupMutation.mutate('firewall')}
                    title="Block opponent's next turn"
                >
                    <Shield className="w-3 h-3 mr-1" /> FIREWALL
                </Button>
                <Button 
                    variant="outline" 
                    className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10 text-[10px]"
                    disabled={!isMyTurn || myPowerups.bruteforce || powerupMutation.isPending}
                    onClick={() => powerupMutation.mutate('bruteforce')}
                    title="Reveal one digit (Simulation)"
                >
                    <Zap className="w-3 h-3 mr-1" /> BRUTEFORCE
                </Button>
            </div>

            <Button 
              className={cn(
                "w-full max-w-xs h-14 neon-border text-lg tracking-widest font-black transition-all",
                !isMyTurn && "opacity-50 grayscale cursor-not-allowed"
              )}
              disabled={guessVal.length < 4 || guessMutation.isPending || !isMyTurn}
              onClick={() => guessMutation.mutate({ player: activeP, guess: guessVal })}
            >
              {guessMutation.isPending ? "LAUNCHING..." : !isMyTurn ? "OPPONENT TURN..." : "EXECUTE ATTACK"}
            </Button>
          </div>

          {/* FIX: Removed h-full, used flex-col + min-h-0 + overflow-hidden to constrain children */}
          <div className="flex flex-col min-h-0 overflow-hidden">
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
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Loader2, Plus, Terminal, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function Landing() {
  const [, setLocation] = useLocation();

  const createGame = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, { method: 'POST' });
      return await res.json();
    },
    onSuccess: (data) => {
      setLocation(`/game/${data.id}`);
    }
  });

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Hand-drawn circuit accent */}
      <div className="absolute -bottom-10 -left-10 w-64 h-64 opacity-5 pointer-events-none rotate-12">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-primary fill-none">
          <path d="M10 10 Q 50 10 50 50 T 90 90" strokeWidth="0.5" />
          <rect x="45" y="45" width="10" height="10" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="z-10 text-center space-y-12 max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-primary opacity-40">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-mono tracking-[0.5em] uppercase">Tactical Neural Interface</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black font-mono tracking-tighter text-primary glitch-effect uppercase" data-text="ENCRYPTION">
            ENCRYPTION<br/><span className="text-primary/40">WAR</span>
          </h1>
          
          <p className="text-primary/40 font-mono text-sm tracking-wide max-w-md mx-auto leading-relaxed">
            Neural link established. Objective: Compromise opponent's 4-digit master key. 
            <br/><span className="text-primary/20 italic">Do not let your encryption fail.</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <button 
            onClick={() => createGame.mutate()}
            disabled={createGame.isPending}
            className="group relative px-12 py-4 bg-primary/5 border border-primary text-primary font-mono tracking-[0.3em] uppercase hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="absolute inset-0 border border-primary opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
            {createGame.isPending ? (
              <span className="flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin" /> INITIALIZING...</span>
            ) : (
              <span className="flex items-center gap-3"><Plus className="w-4 h-4" /> CREATE PRIVATE ROOM</span>
            )}
          </button>
          
          <div className="flex items-center gap-2 opacity-20 text-[10px] font-mono tracking-widest uppercase mt-4">
            <Lock className="w-3 h-3" />
            <span>End-to-End Encrypted Tunnel</span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 font-mono text-[8px] opacity-10 uppercase tracking-[1em]">
        OS_CORE_VERSION_1.0.4_STABLE
      </div>
    </div>
  );
}

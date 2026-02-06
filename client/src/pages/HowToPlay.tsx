import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Target, Binary, ArrowLeft, Terminal } from "lucide-react";

export default function HowToPlay() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-primary overflow-y-auto">
      <div className="max-w-2xl w-full space-y-6 bg-black/80 p-6 md:p-8 border border-primary/20 rounded-lg backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,0,0.1)] my-4">
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-primary/20 pb-6">
          <div className="flex justify-center mb-2">
            <Terminal className="w-12 h-12 text-cyan-500 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-widest glitch-effect text-white">
            MISSION BRIEFING
          </h1>
          <p className="text-xs md:text-sm font-mono opacity-60 text-primary">
            // AUTHORIZED PERSONNEL ONLY // READ CAREFULLY
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
            {/* Objective */}
            <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                    <Target className="w-5 h-5 text-fuchsia-500" /> OBJECTIVE
                </h3>
                <p className="text-xs md:text-sm opacity-80 font-mono leading-relaxed">
                    Your enemy has a secret <span className="text-white font-bold">4-digit code</span>. Your mission is to crack it before they crack yours.
                </p>
            </div>

            {/* Feedback */}
            <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                    <Binary className="w-5 h-5 text-green-500" /> DECRYPTION
                </h3>
                <ul className="text-xs md:text-sm opacity-80 font-mono space-y-2 bg-primary/5 p-3 rounded border border-primary/10">
                    <li className="flex gap-2">
                        <span className="text-green-500 font-bold">HITS:</span> 
                        <span>Correct digit in Correct place.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-yellow-500 font-bold">CLOSE:</span> 
                        <span>Correct digit but Wrong place.</span>
                    </li>
                </ul>
            </div>

             {/* Powerups */}
             <div className="col-span-full space-y-4 border-t border-primary/10 pt-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                    <Zap className="w-5 h-5 text-yellow-500" /> ARSENAL (POWERUPS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/50 p-4 rounded border border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
                        <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm mb-2">
                            <Shield className="w-4 h-4" /> FIREWALL
                        </div>
                        <p className="text-xs opacity-70 font-mono">
                            Blocks the turn switch. Grants you an <span className="text-white">immediate extra turn</span> to guess again.
                        </p>
                    </div>
                    <div className="bg-black/50 p-4 rounded border border-red-500/20 hover:border-red-500/50 transition-colors">
                        <div className="flex items-center gap-2 text-red-500 font-bold text-sm mb-2">
                            <Zap className="w-4 h-4" /> BRUTEFORCE
                        </div>
                        <p className="text-xs opacity-70 font-mono">
                            Hacks the enemy system to <span className="text-white">permanently reveal the first digit</span> of their code.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="pt-6 border-t border-primary/20 flex justify-center">
            <Button 
                variant="outline" 
                className="w-full md:w-auto px-8 py-6 neon-border gap-2 text-lg hover:bg-primary/10 font-bold tracking-wider"
                onClick={() => setLocation("/")}
            >
                <ArrowLeft className="w-5 h-5" /> RETURN TO BASE
            </Button>
        </div>

      </div>
    </div>
  );
}
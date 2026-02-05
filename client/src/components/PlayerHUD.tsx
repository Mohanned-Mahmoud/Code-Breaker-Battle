import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Shield, Database, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { CyberButton } from './CyberButton';
import { CyberInput } from './CyberInput';
import { useState, useRef, useEffect } from 'react';
import { Guess, GameStateResponse } from '@shared/schema';

interface PlayerHUDProps {
  player: 'p1' | 'p2';
  game: GameStateResponse;
  isActive: boolean;
  onGuess: (guess: string) => void;
  onPowerup: (type: 'firewall' | 'bruteforce') => void;
  opponentGuesses: Guess[];
}

export function PlayerHUD({ player, game, isActive, onGuess, onPowerup, opponentGuesses }: PlayerHUDProps) {
  const [guessInput, setGuessInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isP1 = player === 'p1';
  const variant = isP1 ? 'p1' : 'p2';
  const primaryColor = isP1 ? 'var(--p1-primary)' : 'var(--p2-primary)';
  
  // Powerups usage state
  const firewallUsed = isP1 ? game.p1FirewallUsed : game.p2FirewallUsed;
  const bruteforceUsed = isP1 ? game.p1BruteforceUsed : game.p2BruteforceUsed;
  const opponentFirewallUsed = isP1 ? game.p2FirewallUsed : game.p1FirewallUsed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.length === 4 && isActive) {
      onGuess(guessInput);
      setGuessInput("");
    }
  };

  // Scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [opponentGuesses]);

  return (
    <div className={cn(
      "relative flex flex-col h-full border-r border-white/10 p-4 md:p-6 transition-opacity duration-500",
      isActive ? "opacity-100 bg-black/20" : "opacity-40 grayscale-[0.5]",
      !isP1 && "border-l border-r-0"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full animate-pulse", isP1 ? "bg-[hsl(var(--p1-primary))]" : "bg-[hsl(var(--p2-primary))]")} />
          <h2 className={cn("text-2xl font-bold font-display", isP1 ? "text-[hsl(var(--p1-primary))]" : "text-[hsl(var(--p2-primary))]")}>
            PLAYER {isP1 ? '01' : '02'}
          </h2>
        </div>
        <div className="flex gap-2 text-xs font-mono opacity-60">
          <span>STATUS:</span>
          <span className={isActive ? "text-green-400" : "text-red-400"}>{isActive ? "ACTIVE" : "STANDBY"}</span>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <CyberInput
            variant={variant}
            placeholder="XXXX"
            maxLength={4}
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={!isActive}
            className="text-center text-4xl py-4 tracking-[1em]"
            autoFocus={isActive}
          />
          <CyberButton 
            variant={variant} 
            className="w-full"
            disabled={!isActive || guessInput.length !== 4}
            glitch={isActive && guessInput.length === 4}
          >
            {isActive ? "EXECUTE HACK" : "SYSTEM LOCKED"}
          </CyberButton>
        </form>
      </div>

      {/* Powerups Panel */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="space-y-2">
          <CyberButton
            variant={variant}
            className="w-full text-xs py-2 flex items-center justify-center gap-2"
            disabled={!isActive || firewallUsed}
            onClick={() => onPowerup('firewall')}
          >
            <Shield className="w-4 h-4" />
            FIREWALL
          </CyberButton>
          <p className="text-[10px] text-center opacity-50 uppercase font-mono">Skip Opponent Turn</p>
        </div>
        <div className="space-y-2">
          <CyberButton
            variant={variant}
            className="w-full text-xs py-2 flex items-center justify-center gap-2"
            disabled={!isActive || bruteforceUsed}
            onClick={() => onPowerup('bruteforce')}
          >
            <Database className="w-4 h-4" />
            BRUTE FORCE
          </CyberButton>
          <p className="text-[10px] text-center opacity-50 uppercase font-mono">Reveal Odd/Even Sum</p>
        </div>
      </div>

      {/* History Log (Opponent's guesses against YOU basically, or your guesses?) 
          Actually in this game, we show YOUR guesses against the opponent to track progress.
          The schema says `guesses` has `player` field. If I am P1, I want to see P1's guesses.
      */}
      <div className="flex-1 min-h-0 flex flex-col bg-black/40 border border-white/5 rounded p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/80 to-transparent z-10" />
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
          <Lock className="w-3 h-3" /> ATTACK LOG
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-sm custom-scrollbar" ref={scrollRef}>
          {opponentGuesses.length === 0 && (
            <div className="text-white/20 text-center mt-10 italic">No packets sent yet...</div>
          )}
          {opponentGuesses.map((guess, idx) => (
            <motion.div 
              key={guess.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between border-b border-white/5 pb-2"
            >
              <span className="opacity-50 text-xs">#{String(idx + 1).padStart(2, '0')}</span>
              <span className={cn("font-bold tracking-widest", isP1 ? "text-cyan-400" : "text-rose-400")}>
                {guess.guess}
              </span>
              <div className="flex gap-4 text-xs">
                <span className="text-green-400 flex items-center gap-1">
                  HITS: {guess.hits}
                </span>
                <span className="text-yellow-400 flex items-center gap-1">
                  BLIPS: {guess.blips}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/80 to-transparent z-10" />
      </div>

      {/* Alert Overlay for Powerups */}
      {game.bruteForceResult && isActive && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-4 z-50 bg-black/90 border border-white/20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm"
        >
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-white mb-2">BRUTE FORCE RESULT</h3>
          <p className="font-mono text-sm text-white/80">
            Opponent's sum is <strong className="text-yellow-400 text-lg uppercase">{game.bruteForceResult.type}</strong>
            <br />
            (Sum: {game.bruteForceResult.sum})
          </p>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Terminal, Bomb, User, Users, Zap, Shield, Bug, Edit2, Shuffle, Radio, Eye, Ghost, Skull, Timer, Crosshair, Target, Anchor, FileDown, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export default function HowToPlay() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'1v1' | 'party' | 'powerups'>('1v1');
  const { theme } = useTheme();
  const isRamadan = theme === "ramadan";

  // Red dot notification component
  const NotificationDot = () => (
    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
  );

  return (
    <div className={cn("h-[100dvh] w-full bg-background flex flex-col items-center p-4 overflow-hidden relative", isRamadan ? "font-ramadan" : "font-mono")}>
      
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
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        )}
      </div>

      <div className="w-full max-w-4xl z-10 flex flex-col h-full">
        {/* Header */}
        <div className={cn("flex items-center justify-between border-b pb-4 mb-6 shrink-0 mt-4", isRamadan ? "border-amber-500/30" : "border-primary/30")}>
          <Button variant="ghost" onClick={() => setLocation('/')} className={cn("hover:bg-transparent tracking-[0.2em] text-[10px]", isRamadan ? "text-amber-500/60 hover:text-amber-400 font-ramadan" : "text-primary/60 hover:text-primary font-mono")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> ABORT
          </Button>
          <div className={cn("flex items-center gap-3", isRamadan ? "text-amber-400" : "text-primary")}>
            {isRamadan ? <Moon className="w-6 h-6" /> : <Terminal className="w-6 h-6" />}
            <h1 className={cn("text-xl md:text-3xl font-black tracking-[0.3em] uppercase", isRamadan ? "font-ramadan bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "font-mono glitch-effect")}>
              {isRamadan ? "Night Chronicles" : "Operator Manual"}
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 w-full mb-6 shrink-0 overflow-x-auto custom-scrollbar pb-2">
          <button onClick={() => setActiveTab('1v1')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", 
            isRamadan 
              ? (activeTab === '1v1' ? "bg-amber-500/20 border-amber-500 text-amber-400 rounded-xl" : "border-amber-500/20 text-amber-400/50 hover:border-amber-500/50 rounded-xl")
              : (activeTab === '1v1' ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,255,0,0.2)]" : "border-primary/20 text-primary/50 hover:border-primary/50")
          )}>
            <User className="w-4 h-4" /> 1V1 BATTLE
            <NotificationDot />
          </button>
          
          <button onClick={() => setActiveTab('party')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", 
            isRamadan 
              ? (activeTab === 'party' ? "bg-purple-500/20 border-purple-500 text-purple-400 rounded-xl" : "border-purple-500/20 text-purple-400/50 hover:border-purple-500/50 rounded-xl")
              : (activeTab === 'party' ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-500 shadow-[0_0_15px_rgba(232,121,249,0.2)]" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:border-fuchsia-500/50")
          )}>
            <Users className="w-4 h-4" /> PARTY MODE
            <NotificationDot />
          </button>
          
          <button onClick={() => setActiveTab('powerups')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", 
            isRamadan 
              ? (activeTab === 'powerups' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 rounded-xl" : "border-cyan-500/20 text-cyan-400/50 hover:border-cyan-500/50 rounded-xl")
              : (activeTab === 'powerups' ? "bg-blue-500/20 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-blue-500/20 text-blue-500/50 hover:border-blue-500/50")
          )}>
            <Zap className="w-4 h-4" /> ARSENAL
            <NotificationDot />
          </button>
        </div>

        {/* Content Area */}
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar border p-4 md:p-8 transition-all duration-700", 
          isRamadan ? "bg-[#0B132B]/90 border-amber-500/40 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_60px_rgba(251,191,36,0.1)]" : "border-white/10 bg-black/40 rounded"
        )}>
          <AnimatePresence mode="wait">
            
            {/* 1V1 RULES */}
            {activeTab === '1v1' && (
              <motion.div key="1v1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={cn("space-y-8", isRamadan ? "text-amber-100/80" : "text-primary/80")}>
                <section>
                  <h2 className={cn("text-xl font-bold mb-3 flex items-center gap-2 border-b pb-2", isRamadan ? "text-amber-400 border-amber-500/20" : "text-primary border-primary/20")}><Target className="w-5 h-5"/> THE BASICS</h2>
                  <p className="text-sm leading-relaxed mb-4">You and your opponent must both define a secret <strong>4-digit Master Key</strong>. Take turns guessing each other's key. The first hacker to crack the code wins.</p>
                  <div className={cn("border p-4 space-y-2", isRamadan ? "bg-amber-500/5 border-amber-500/20 rounded-xl" : "bg-primary/5 border-primary/20 rounded")}>
                    <p className="text-sm"><span className="text-green-400 font-bold">HITS:</span> A digit is correct AND in the exact right position.</p>
                    <p className="text-sm"><span className="text-yellow-400 font-bold">CLOSE:</span> A digit is correct but in the wrong position.</p>
                  </div>
                </section>

                <section>
                  <h2 className={cn("text-xl font-bold mb-3 border-b pb-2", isRamadan ? "text-amber-400 border-amber-500/20" : "text-primary border-primary/20")}>GAME MODES</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={cn("border p-4 bg-black/50", isRamadan ? "border-amber-500/30 rounded-xl" : "border-primary/20")}>
                      <h3 className={cn("font-bold mb-1", isRamadan ? "text-amber-400" : "text-primary")}>NORMAL</h3>
                      <p className="text-xs opacity-70">Standard turn-based battle. No time limits. Pure logic and deduction.</p>
                    </div>
                    <div className={cn("border border-red-500/30 p-4 bg-red-900/10", isRamadan ? "rounded-xl" : "")}>
                      <h3 className="font-bold text-red-500 mb-1">BLITZ</h3>
                      <p className="text-xs opacity-70 text-red-200">You only have <strong>30 seconds</strong> per turn. If the timer hits zero, your turn is skipped!</p>
                    </div>
                    <div className={cn("border border-purple-500/30 p-4 bg-purple-900/10 md:col-span-2", isRamadan ? "rounded-xl" : "")}>
                      <h3 className="font-bold text-purple-500 mb-1">GLITCH</h3>
                      <p className="text-xs opacity-70 text-purple-200">After a random interval of 3 to 8 turns, the system suffers a catastrophic failure: Codes might shuffle, a digit might mutate, powerups might restore, or intel could leak!</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className={cn("text-xl font-bold mb-3 flex items-center gap-2 border-b pb-2", isRamadan ? "text-amber-400 border-amber-500/20" : "text-primary border-primary/20")}>
                    <FileDown className="w-5 h-5"/> POST-MATCH ARCHIVE 
                    <span className="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded tracking-widest font-black animate-pulse">NEW</span>
                  </h2>
                  <div className={cn("border p-4", isRamadan ? "bg-amber-500/5 border-amber-500/20 rounded-xl" : "bg-primary/5 border-primary/20 rounded")}>
                    <p className="text-sm leading-relaxed">
                      At the end of any match, you can download the <strong>Master Log Archive</strong> as a PDF. <br/><br/>
                      If your opponent used a <strong>VIRUS</strong> to delete your in-game terminal history during the battle, the post-match archive will completely recover the corrupted data, allowing you to review the entire unaltered match!
                    </p>
                  </div>
                </section>
              </motion.div>
            )}

            {/* PARTY RULES */}
            {activeTab === 'party' && (
              <motion.div key="party" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={cn("space-y-8", isRamadan ? "text-purple-200/80" : "text-fuchsia-500/80")}>
                <section>
                  <h2 className={cn("text-xl font-bold mb-3 flex items-center gap-2 border-b pb-2", isRamadan ? "text-purple-400 border-purple-500/20" : "text-fuchsia-500 border-fuchsia-500/20")}><Users className="w-5 h-5"/> SQUAD MECHANICS</h2>
                  <p className="text-sm leading-relaxed mb-4">Play with 3 to 6 players. In your turn, you must <strong>Select a Target</strong> from the grid, then use a Powerup or launch a Guess against them.</p>
                </section>

                <section>
                  <h2 className={cn("text-xl font-bold mb-3 border-b pb-2", isRamadan ? "text-purple-400 border-purple-500/20" : "text-fuchsia-500 border-fuchsia-500/20")}>WIN CONDITIONS</h2>
                  <div className="space-y-4">
                    
                    {/* BOUNTY CONTRACTS (NEW) */}
                    <div className={cn("border border-yellow-500/30 p-4 bg-yellow-900/10 relative overflow-hidden", isRamadan ? "rounded-xl" : "rounded")}>
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(234,179,8,0.05)_10px,rgba(234,179,8,0.05)_20px)] pointer-events-none" />
                      <h3 className="font-bold text-yellow-500 mb-2 flex items-center gap-2 relative z-10">
                        <Target className="w-4 h-4"/> BOUNTY CONTRACTS
                        <span className="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded tracking-widest font-black animate-pulse">NEW</span>
                      </h3>
                      <ul className="text-xs space-y-2 text-yellow-100/80 list-disc list-inside pl-4 relative z-10">
                        <li><strong>The Hunt:</strong> A random living player is marked as the global <strong>Bounty Target</strong> for a limited time.</li>
                        <li><strong>The Reward:</strong> If you successfully crack the Bounty Target, you instantly receive a massive <span className="text-yellow-400 font-bold">+6 PTS</span> (Base 3 + 3 Bonus).</li>
                        <li><strong>Survival:</strong> If you are the target, you must survive until the contract expires to trigger a cooldown phase!</li>
                      </ul>
                    </div>

                    <div className={cn("border border-cyan-500/30 p-4 bg-cyan-900/10", isRamadan ? "rounded-xl" : "rounded")}>
                      <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2"><Crosshair className="w-4 h-4"/> POINTS SYSTEM (FREE FOR ALL)</h3>
                      <ul className="text-xs space-y-2 text-cyan-100/70 list-disc list-inside pl-4">
                        <li><strong>Cracking a Code (4 HITS):</strong> Grants <span className="text-green-400 font-bold">+3 PTS</span>.</li>
                        <li><strong>Partial Hit (2+ HITS):</strong> Grants <span className="text-yellow-400 font-bold">+1 PT</span>.</li>
                        <li><strong>System Crash:</strong> If your code is cracked, your system crashes! You must <strong>manually enter a new 4-digit key</strong> to reboot and continue playing. You cannot attack while rebooting.</li>
                        <li>First hacker to reach the Target Score wins.</li>
                      </ul>
                    </div>

                    <div className={cn("border border-red-500/30 p-4 bg-red-900/10", isRamadan ? "rounded-xl" : "rounded")}>
                      <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2"><Skull className="w-4 h-4"/> ELIMINATION (BATTLE ROYALE)</h3>
                      <p className="text-xs text-red-200/70">If your code is cracked, you are eliminated! However, if <strong>GHOST PROTOCOL</strong> is active, dead players can still use their unused powerups to sabotage the living.</p>
                    </div>

                  </div>
                </section>
              </motion.div>
            )}

            {/* POWERUPS RULES */}
            {activeTab === 'powerups' && (
              <motion.div key="powerups" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <p className={cn("text-sm mb-6", isRamadan ? "text-cyan-200/80" : "text-blue-400/80")}>Equip these cyber-weapons in Custom or Party mode. Most powerups can only be used <strong>ONCE</strong> per match.</p>
                
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-yellow-500/30 bg-black/40" : "border-yellow-500/30 bg-yellow-500/5")}>
                    <Shield className="w-8 h-8 text-yellow-500 shrink-0" />
                    <div><h4 className="font-bold text-yellow-500 text-sm">FIREWALL</h4><p className="text-[10px] text-yellow-200/60 mt-1">Blocks the next player's turn entirely. Great for defense.</p></div>
                  </div>
                  
                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-orange-500/30 bg-black/40" : "border-orange-500/30 bg-orange-500/5")}>
                    <Timer className="w-8 h-8 text-orange-500 shrink-0" />
                    <div><h4 className="font-bold text-orange-500 text-sm">DDoS ATTACK</h4><p className="text-[10px] text-orange-200/60 mt-1">In Blitz mode, reduces the active player's timer by 20 seconds instantly.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-green-500/30 bg-black/40" : "border-green-500/30 bg-green-500/5")}>
                    <Bug className="w-8 h-8 text-green-500 shrink-0" />
                    <div><h4 className="font-bold text-green-500 text-sm">VIRUS</h4><p className="text-[10px] text-green-200/60 mt-1">Deletes the global in-game logs. Opponents temporarily lose their guess history.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-red-500/30 bg-black/40" : "border-red-500/30 bg-red-500/5")}>
                    <Zap className="w-8 h-8 text-red-500 shrink-0" />
                    <div><h4 className="font-bold text-red-500 text-sm">BRUTEFORCE</h4><p className="text-[10px] text-red-200/60 mt-1">Select a target. Instantly reveals the first digit of their Master Key.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-blue-500/30 bg-black/40" : "border-blue-500/30 bg-blue-500/5")}>
                    <Edit2 className="w-8 h-8 text-blue-500 shrink-0" />
                    <div><h4 className="font-bold text-blue-500 text-sm">CHANGE DIGIT</h4><p className="text-[10px] text-blue-200/60 mt-1">Mutate one digit of your own code to confuse attackers tracking your numbers.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-purple-500/30 bg-black/40" : "border-purple-500/30 bg-purple-500/5")}>
                    <Shuffle className="w-8 h-8 text-purple-500 shrink-0" />
                    <div><h4 className="font-bold text-purple-500 text-sm">SWAP DIGITS</h4><p className="text-[10px] text-purple-200/60 mt-1">Swap the positions of two digits in your own code.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-cyan-500/30 bg-black/40" : "border-cyan-500/30 bg-cyan-500/5")}>
                    <Radio className="w-8 h-8 text-cyan-400 shrink-0" />
                    <div><h4 className="font-bold text-cyan-400 text-sm">EMP (STEALTH)</h4><p className="text-[10px] text-cyan-200/60 mt-1">Jams the target. Their next guess against anyone will return "░░" (Corrupted Data).</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-emerald-500/30 bg-black/40" : "border-emerald-500/30 bg-emerald-500/5")}>
                    <Eye className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div><h4 className="font-bold text-emerald-400 text-sm">SPYWARE</h4><p className="text-[10px] text-emerald-200/60 mt-1">Select a target. Reveals the mathematical SUM of all 4 digits in their key.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3", isRamadan ? "rounded-xl border-indigo-500/30 bg-black/40" : "border-indigo-500/30 bg-indigo-500/5")}>
                    <Ghost className="w-8 h-8 text-indigo-400 shrink-0" />
                    <div><h4 className="font-bold text-indigo-400 text-sm">HONEYPOT (STEALTH)</h4><p className="text-[10px] text-indigo-200/60 mt-1">Sets a trap on your own code. The next time someone guesses your code, they receive completely FAKE feedback to ruin their logic.</p></div>
                  </div>

                  <div className={cn("p-3 border flex gap-3 relative overflow-hidden shadow-[0_0_15px_rgba(244,114,182,0.1)]", isRamadan ? "rounded-xl border-pink-500/50 bg-black/40" : "border-pink-500/50 bg-pink-500/10")}>
                    <div className={cn("absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-3 py-1 tracking-widest z-10", isRamadan ? "rounded-bl-xl" : "rounded-bl")}>NEW</div>
                    <Anchor className="w-8 h-8 text-pink-400 shrink-0" />
                    <div><h4 className="font-bold text-pink-400 text-sm pr-6">PHISHING (THEFT)</h4><p className="text-[10px] text-pink-200/70 mt-1">Launches a phishing link to randomly steal one unused powerup from your opponent's arsenal and immediately add it to your own.</p></div>
                  </div>
                  
                  <div className={cn("p-3 border flex gap-3 relative overflow-hidden shadow-[0_0_15px_rgba(161,161,170,0.1)]", isRamadan ? "rounded-xl border-zinc-500/50 bg-black/40" : "border-zinc-500/50 bg-zinc-500/10")}>
                    <div className={cn("absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-3 py-1 tracking-widest z-10", isRamadan ? "rounded-bl-xl" : "rounded-bl")}>NEW</div>
                    <Bomb className="w-8 h-8 text-zinc-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-zinc-400 text-sm pr-6">LOGIC BOMB (SILENCE)</h4>
                      <p className="text-[10px] text-zinc-300/70 mt-1">Select a target. Throws a logic bomb that completely disables their ability to use ANY powerups for their next 2 turns!</p>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
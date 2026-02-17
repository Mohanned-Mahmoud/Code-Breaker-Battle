import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Terminal, User, Users, Zap, Shield, Bug, Edit2, Shuffle, Radio, Eye, Ghost, Skull, Timer, Crosshair, Target, Anchor, FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HowToPlay() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'1v1' | 'party' | 'powerups'>('1v1');

  // Red dot notification component
  const NotificationDot = () => (
    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
  );

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col items-center p-4 overflow-hidden relative font-mono">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-4xl z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/30 pb-4 mb-6 shrink-0 mt-4">
          <Button variant="ghost" onClick={() => setLocation('/')} className="text-primary/60 hover:text-primary hover:bg-primary/10 tracking-[0.2em] text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> ABORT
          </Button>
          <div className="flex items-center gap-3 text-primary">
            <Terminal className="w-6 h-6" />
            <h1 className="text-2xl md:text-3xl font-black tracking-[0.3em] uppercase glitch-effect">Operator Manual</h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 w-full mb-6 shrink-0 overflow-x-auto custom-scrollbar pb-2">
          <button onClick={() => setActiveTab('1v1')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", activeTab === '1v1' ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,255,0,0.2)]" : "border-primary/20 text-primary/50 hover:border-primary/50")}>
            <User className="w-4 h-4" /> 1V1 BATTLE
            <NotificationDot />
          </button>
          <button onClick={() => setActiveTab('party')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", activeTab === 'party' ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-500 shadow-[0_0_15px_rgba(232,121,249,0.2)]" : "border-fuchsia-500/20 text-fuchsia-500/50 hover:border-fuchsia-500/50")}>
            <Users className="w-4 h-4" /> PARTY MODE
          </button>
          <button onClick={() => setActiveTab('powerups')} className={cn("relative flex-1 min-w-[120px] py-3 px-4 border transition-all flex items-center justify-center gap-2 font-bold tracking-widest text-xs", activeTab === 'powerups' ? "bg-blue-500/20 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-blue-500/20 text-blue-500/50 hover:border-blue-500/50")}>
            <Zap className="w-4 h-4" /> ARSENAL
            <NotificationDot />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 bg-black/40 p-4 md:p-8 rounded">
          <AnimatePresence mode="wait">
            
            {/* 1V1 RULES */}
            {activeTab === '1v1' && (
              <motion.div key="1v1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8 text-primary/80">
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2 border-b border-primary/20 pb-2"><Target className="w-5 h-5"/> THE BASICS</h2>
                  <p className="text-sm leading-relaxed mb-4">You and your opponent must both define a secret <strong>4-digit Master Key</strong>. Take turns guessing each other's key. The first hacker to crack the code wins.</p>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded space-y-2">
                    <p className="text-sm"><span className="text-green-400 font-bold">HITS:</span> A digit is correct AND in the exact right position.</p>
                    <p className="text-sm"><span className="text-yellow-400 font-bold">CLOSE:</span> A digit is correct but in the wrong position.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-3 border-b border-primary/20 pb-2">GAME MODES</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-primary/20 p-4 bg-black/50">
                      <h3 className="font-bold text-primary mb-1">NORMAL</h3>
                      <p className="text-xs opacity-70">Standard turn-based battle. No time limits. Pure logic and deduction.</p>
                    </div>
                    <div className="border border-red-500/30 p-4 bg-red-900/10">
                      <h3 className="font-bold text-red-500 mb-1">BLITZ</h3>
                      <p className="text-xs opacity-70 text-red-200">You only have <strong>30 seconds</strong> per turn. If the timer hits zero, your turn is skipped!</p>
                    </div>
                    <div className="border border-purple-500/30 p-4 bg-purple-900/10 md:col-span-2">
                      <h3 className="font-bold text-purple-500 mb-1">GLITCH</h3>
                      <p className="text-xs opacity-70 text-purple-200">After a random interval of 3 to 8 turns, the system suffers a catastrophic failure: Codes might shuffle, a digit might mutate, powerups might restore, or intel could leak!</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2 border-b border-primary/20 pb-2">
                    <FileDown className="w-5 h-5"/> POST-MATCH ARCHIVE 
                    <span className="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded tracking-widest font-black animate-pulse">NEW</span>
                  </h2>
                  <div className="border border-primary/20 p-4 bg-primary/5 rounded">
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
              <motion.div key="party" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8 text-fuchsia-500/80">
                <section>
                  <h2 className="text-xl font-bold text-fuchsia-500 mb-3 flex items-center gap-2 border-b border-fuchsia-500/20 pb-2"><Users className="w-5 h-5"/> SQUAD MECHANICS</h2>
                  <p className="text-sm leading-relaxed mb-4">Play with 3 to 6 players. In your turn, you must <strong>Select a Target</strong> from the grid, then use a Powerup or launch a Guess against them.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-fuchsia-500 mb-3 border-b border-fuchsia-500/20 pb-2">WIN CONDITIONS</h2>
                  <div className="space-y-4">
                    <div className="border border-cyan-500/30 p-4 bg-cyan-900/10 rounded">
                      <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> POINTS SYSTEM</h3>
                      <ul className="text-xs space-y-2 text-cyan-100/70 list-disc list-inside pl-4">
                        <li><strong>Cracking a Code (4 HITS):</strong> Grants <span className="text-green-400 font-bold">+3 PTS</span>.</li>
                        <li><strong>Partial Hit (2+ HITS):</strong> Grants <span className="text-yellow-400 font-bold">+1 PT</span>.</li>
                        <li><strong>System Crash:</strong> If your code is cracked, your system crashes! You must <strong>manually enter a new 4-digit key</strong> to reboot and continue playing. You cannot attack while rebooting.</li>
                        <li>First hacker to reach the Target Score wins.</li>
                      </ul>
                    </div>
                    <div className="border border-red-500/30 p-4 bg-red-900/10 rounded">
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
                <p className="text-sm text-blue-400/80 mb-6">Equip these cyber-weapons in Custom or Party mode. Most powerups can only be used <strong>ONCE</strong> per match.</p>
                
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 border border-yellow-500/30 bg-yellow-500/5 flex gap-3">
                    <Shield className="w-8 h-8 text-yellow-500 shrink-0" />
                    <div><h4 className="font-bold text-yellow-500 text-sm">FIREWALL</h4><p className="text-[10px] text-yellow-200/60 mt-1">Blocks the next player's turn entirely. Great for defense.</p></div>
                  </div>
                  
                  <div className="p-3 border border-orange-500/30 bg-orange-500/5 flex gap-3">
                    <Timer className="w-8 h-8 text-orange-500 shrink-0" />
                    <div><h4 className="font-bold text-orange-500 text-sm">DDoS ATTACK</h4><p className="text-[10px] text-orange-200/60 mt-1">In Blitz mode, reduces the active player's timer by 20 seconds instantly.</p></div>
                  </div>

                  <div className="p-3 border border-green-500/30 bg-green-500/5 flex gap-3">
                    <Bug className="w-8 h-8 text-green-500 shrink-0" />
                    <div><h4 className="font-bold text-green-500 text-sm">VIRUS</h4><p className="text-[10px] text-green-200/60 mt-1">Deletes the global in-game logs. Opponents temporarily lose their guess history.</p></div>
                  </div>

                  <div className="p-3 border border-red-500/30 bg-red-500/5 flex gap-3">
                    <Zap className="w-8 h-8 text-red-500 shrink-0" />
                    <div><h4 className="font-bold text-red-500 text-sm">BRUTEFORCE</h4><p className="text-[10px] text-red-200/60 mt-1">Select a target. Instantly reveals the first digit of their Master Key.</p></div>
                  </div>

                  <div className="p-3 border border-blue-500/30 bg-blue-500/5 flex gap-3">
                    <Edit2 className="w-8 h-8 text-blue-500 shrink-0" />
                    <div><h4 className="font-bold text-blue-500 text-sm">CHANGE DIGIT</h4><p className="text-[10px] text-blue-200/60 mt-1">Mutate one digit of your own code to confuse attackers tracking your numbers.</p></div>
                  </div>

                  <div className="p-3 border border-purple-500/30 bg-purple-500/5 flex gap-3">
                    <Shuffle className="w-8 h-8 text-purple-500 shrink-0" />
                    <div><h4 className="font-bold text-purple-500 text-sm">SWAP DIGITS</h4><p className="text-[10px] text-purple-200/60 mt-1">Swap the positions of two digits in your own code.</p></div>
                  </div>

                  <div className="p-3 border border-cyan-500/30 bg-cyan-500/5 flex gap-3">
                    <Radio className="w-8 h-8 text-cyan-400 shrink-0" />
                    <div><h4 className="font-bold text-cyan-400 text-sm">EMP (STEALTH)</h4><p className="text-[10px] text-cyan-200/60 mt-1">Jams the target. Their next guess against anyone will return "░░" (Corrupted Data).</p></div>
                  </div>

                  <div className="p-3 border border-emerald-500/30 bg-emerald-500/5 flex gap-3">
                    <Eye className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div><h4 className="font-bold text-emerald-400 text-sm">SPYWARE</h4><p className="text-[10px] text-emerald-200/60 mt-1">Select a target. Reveals the mathematical SUM of all 4 digits in their key.</p></div>
                  </div>

                  <div className="p-3 border border-indigo-500/30 bg-indigo-500/5 flex gap-3">
                    <Ghost className="w-8 h-8 text-indigo-400 shrink-0" />
                    <div><h4 className="font-bold text-indigo-400 text-sm">HONEYPOT (STEALTH)</h4><p className="text-[10px] text-indigo-200/60 mt-1">Sets a trap on your own code. The next time someone guesses your code, they receive completely FAKE feedback to ruin their logic.</p></div>
                  </div>

                  <div className="p-3 border border-pink-500/50 bg-pink-500/10 flex gap-3 relative overflow-hidden shadow-[0_0_15px_rgba(244,114,182,0.1)]">
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-3 py-1 tracking-widest z-10 rounded-bl">NEW</div>
                    <Anchor className="w-8 h-8 text-pink-400 shrink-0" />
                    <div><h4 className="font-bold text-pink-400 text-sm pr-6">PHISHING (THEFT)</h4><p className="text-[10px] text-pink-200/70 mt-1">Launches a phishing link to randomly steal one unused powerup from your opponent's arsenal and immediately add it to your own.</p></div>
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
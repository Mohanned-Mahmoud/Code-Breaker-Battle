import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

interface TerminalLogProps {
  logs: LogEntry[];
  variant?: 'p1' | 'p2';
  className?: string;
}

export function TerminalLog({ logs, variant = 'p1', className }: TerminalLogProps) {
  return (
    <div className={cn(
      "flex-1 min-h-0 font-mono text-xs md:text-sm overflow-y-auto p-4 bg-black/40 border border-white/10 rounded-sm custom-scrollbar",
      className
    )}>
      <div className="flex flex-col space-y-2">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <span className="opacity-40 select-none">[{log.timestamp}]</span>
              <span className={cn(
                "flex-1 break-words",
                log.type === 'success' && (variant === 'p1' ? 'text-[hsl(var(--p1-primary))]' : 'text-[hsl(var(--p2-primary))]'),
                log.type === 'error' && "text-red-500",
                log.type === 'warning' && "text-yellow-500",
                log.type === 'info' && "text-white/70"
              )}>
                {">"} {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Blinking cursor at the end */}
        <div className="animate-pulse w-2 h-4 bg-current opacity-50 mt-2" />
      </div>
    </div>
  );
}

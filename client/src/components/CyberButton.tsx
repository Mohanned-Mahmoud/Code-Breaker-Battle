import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'p1' | 'p2' | 'neutral';
  glitch?: boolean;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = 'neutral', glitch = false, children, ...props }, ref) => {
    
    const baseStyles = "relative px-6 py-3 font-mono font-bold uppercase tracking-wider transition-all duration-200 border-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      p1: "bg-transparent border-[hsl(var(--p1-primary))] text-[hsl(var(--p1-primary))] hover:bg-[hsl(var(--p1-primary)/0.1)] hover:shadow-[0_0_20px_hsl(var(--p1-primary)/0.4)] active:scale-95",
      p2: "bg-transparent border-[hsl(var(--p2-primary))] text-[hsl(var(--p2-primary))] hover:bg-[hsl(var(--p2-primary)/0.1)] hover:shadow-[0_0_20px_hsl(var(--p2-primary)/0.4)] active:scale-95",
      neutral: "bg-transparent border-white/20 text-white/80 hover:border-white hover:text-white hover:bg-white/5 active:scale-95"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], className, glitch && "glitch-effect")}
        data-text={typeof children === 'string' ? children : undefined}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
        {/* Decorative corners */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
        <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current opacity-50" />
        <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current opacity-50" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />
      </motion.button>
    );
  }
);
CyberButton.displayName = "CyberButton";

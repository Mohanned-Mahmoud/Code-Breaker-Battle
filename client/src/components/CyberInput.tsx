import React from 'react';
import { cn } from '@/lib/utils';

interface CyberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'p1' | 'p2' | 'neutral';
  label?: string;
}

export const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, variant = 'neutral', label, ...props }, ref) => {
    const borderColors = {
      p1: "border-[hsl(var(--p1-primary))]",
      p2: "border-[hsl(var(--p2-primary))]",
      neutral: "border-white/20 focus:border-white/50"
    };

    const textColors = {
      p1: "text-[hsl(var(--p1-primary))]",
      p2: "text-[hsl(var(--p2-primary))]",
      neutral: "text-white"
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className={cn("text-xs font-mono uppercase tracking-widest opacity-70", textColors[variant])}>
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={cn(
              "w-full bg-black/50 border-2 px-4 py-3 font-mono text-xl tracking-[0.2em] outline-none transition-all duration-300",
              "placeholder:text-white/10 placeholder:tracking-normal",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              borderColors[variant],
              textColors[variant],
              className
            )}
            autoComplete="off"
            {...props}
          />
          {/* Scanning line effect on focus */}
          <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-current transition-all duration-500 group-focus-within:w-full opacity-50" />
        </div>
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";

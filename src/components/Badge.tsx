import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  children?: React.ReactNode;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-brand-navy text-white hover:bg-brand-navy/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-500/80",
    outline: "text-slate-950",
    success: "border-transparent bg-emerald-500 text-white",
    warning: "border-transparent bg-brand-gold text-brand-navy"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-navy/50",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }

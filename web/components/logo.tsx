import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-7 w-7 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/30 animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_2px] shadow-emerald-400/60" />
      </div>
      <span className="text-[17px] font-semibold tracking-tight text-foreground">
        PulseWatch
      </span>
    </div>
  );
}

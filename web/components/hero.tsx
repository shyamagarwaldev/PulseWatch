"use client";

import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { monitors, incidents, responseSeries } from "@/lib/data";
import { cn } from "@/lib/utils";

const statusConfig = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    Icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-400",
    text: "text-amber-400",
    Icon: AlertTriangle,
  },
  down: {
    label: "Down",
    dot: "bg-red-400",
    text: "text-red-400",
    Icon: XCircle,
  },
} as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

export function Hero() {
  const maxMs = Math.max(...responseSeries.map((d) => d.ms));

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-40" />
        <div className="absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-1/4 top-40 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px]" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 lg:grid-cols-2 lg:gap-10">
        {/* Left: copy */}
        <div className="flex flex-col items-start">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]"
          >
            Know when your website goes down—before your users do.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            PulseWatch continuously monitors your websites and APIs, performs
            scheduled health checks, tracks uptime, response times, and
            instantly alerts you when something goes wrong.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" className="group rounded-full">
              Get Started
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" className="group rounded-full">
              <Play className="mr-1.5 h-4 w-4" />
              View Demo
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-8 flex items-center gap-5 text-xs text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No
              credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 5 free
              monitors
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Setup in
              2 min
            </span>
          </motion.div>
        </div>

        {/* Right: dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 blur-2xl" />
          <DashboardMockup maxMs={maxMs} />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMockup({ maxMs }: { maxMs: number }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/80 p-0 backdrop-blur-xl shadow-2xl shadow-black/40">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-md bg-accent px-2 py-0.5 font-medium text-foreground/80">
            app.pulsewatch.io
          </span>
        </div>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {/* Uptime stat */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Overall uptime
          </p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              99.97
            </span>
            <span className="mb-1 text-sm text-muted-foreground">%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Healthy
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              last 30 days
            </span>
          </div>
        </div>

        {/* Response time mini stat */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Avg response
          </p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              148
            </span>
            <span className="mb-1 text-sm text-muted-foreground">ms</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-border/70 text-muted-foreground"
            >
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
              Monitoring
            </Badge>
            <span className="text-[11px] text-muted-foreground">12 probes</span>
          </div>
        </div>

        {/* Response time chart */}
        <div className="sm:col-span-2 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Response time · 24h
            </p>
            <span className="text-[11px] text-muted-foreground">UTC</span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {responseSeries.map((d, i) => (
              <motion.div
                key={d.t}
                initial={{ height: 0 }}
                animate={{ height: `${(d.ms / maxMs) * 100}%` }}
                transition={{
                  duration: 0.6,
                  delay: 0.4 + i * 0.04,
                  ease: "easeOut",
                }}
                className={cn(
                  "flex-1 rounded-sm",
                  d.ms > 180 ? "bg-amber-400/70" : "bg-emerald-400/60",
                )}
                style={{ minHeight: 4 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/70">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>22:00</span>
          </div>
        </div>

        {/* Monitors list */}
        <div className="sm:col-span-2 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Monitors
            </p>
            <span className="text-[11px] text-muted-foreground">
              {monitors.length} active
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {monitors.slice(0, 3).map((m) => {
              const s = statusConfig[m.status];
              return (
                <div
                  key={m.name}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {m.responseTime}ms
                    </span>
                    <span className={cn("text-[11px] font-medium", s.text)}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent incidents */}
        <div className="sm:col-span-2 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Recent incidents
            </p>
            <span className="text-[11px] text-muted-foreground">3</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {incidents.slice(0, 2).map((inc) => (
              <div key={inc.title} className="flex items-start gap-2.5">
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    inc.status === "resolved"
                      ? "text-muted-foreground/60"
                      : "text-amber-400",
                  )}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {inc.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {inc.service} · {inc.time} · {inc.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

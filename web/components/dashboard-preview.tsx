"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { monitors, incidents, responseSeries } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/features";

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

export function DashboardPreview() {
  const maxMs = Math.max(...responseSeries.map((d) => d.ms));

  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Dashboard"
          title="One dashboard for every service you run"
          subtitle="See uptime, response times, and incidents across all your monitors at a glance."
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-14"
        >
          <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/30">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  Monitors
                </span>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 sm:flex">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Search monitors…
                </span>
              </div>
              <Button size="sm" className="rounded-lg">
                <Plus className="mr-1 h-4 w-4" />
                New Monitor
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-px border-b border-border/60 bg-border/40 lg:grid-cols-4">
              {[
                { label: "Total monitors", value: "5", hint: "all active" },
                { label: "Avg uptime", value: "99.97%", hint: "last 30 days" },
                { label: "Avg response", value: "148ms", hint: "last 24h" },
                { label: "Open incidents", value: "1", hint: "monitoring" },
              ].map((s) => (
                <div key={s.label} className="bg-card/60 p-5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {s.hint}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Monitor list */}
              <div className="lg:col-span-2 lg:border-r lg:border-border/60">
                <div className="grid grid-cols-12 gap-2 border-b border-border/60 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  <span className="col-span-5">Service</span>
                  <span className="col-span-2 text-right">Uptime</span>
                  <span className="col-span-2 text-right">Response</span>
                  <span className="col-span-3 text-right">Status</span>
                </div>
                <div className="divide-y divide-border/40">
                  {monitors.map((m, i) => {
                    const s = statusConfig[m.status];
                    return (
                      <motion.div
                        key={m.name}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="grid grid-cols-12 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-accent/30"
                      >
                        <div className="col-span-5 flex items-center gap-2.5">
                          <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {m.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {m.url}
                            </p>
                          </div>
                        </div>
                        <span className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">
                          {m.uptime}%
                        </span>
                        <span className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">
                          {m.responseTime}ms
                        </span>
                        <div className="col-span-3 flex items-center justify-end gap-2">
                          <span className="text-[11px] text-muted-foreground/70">
                            {m.lastChecked}
                          </span>
                          <span className={cn("text-xs font-medium", s.text)}>
                            {s.label}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Right column: chart + incidents */}
              <div className="bg-background/30 p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Response time · 24h
                </p>
                <div className="mt-4 flex h-28 items-end gap-1.5">
                  {responseSeries.map((d, i) => (
                    <motion.div
                      key={d.t}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(d.ms / maxMs) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.03,
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
                  <span>12:00</span>
                  <span>22:00</span>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recent incidents
                  </p>
                  <div className="mt-3 space-y-3">
                    {incidents.map((inc) => (
                      <div
                        key={inc.title}
                        className="rounded-lg border border-border/50 bg-card/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-foreground">
                            {inc.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-border/70 text-[10px]",
                              inc.status === "resolved"
                                ? "text-muted-foreground"
                                : "border-amber-500/30 text-amber-400",
                            )}
                          >
                            {inc.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {inc.service} · {inc.time} · {inc.duration}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

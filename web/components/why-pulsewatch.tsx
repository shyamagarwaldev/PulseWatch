"use client";

import { motion } from "framer-motion";
import {
  Check,
  Timer,
  Eye,
  LayoutDashboard,
  Zap,
  TrendingUp,
} from "lucide-react";
import { SectionHeading } from "@/components/features";

const points = [
  {
    icon: Timer,
    title: "Easy setup",
    desc: "Add a monitor in under a minute — no agent, no install.",
  },
  {
    icon: Eye,
    title: "Reliable monitoring",
    desc: "Global probes check your endpoints around the clock.",
  },
  {
    icon: LayoutDashboard,
    title: "Beautiful dashboard",
    desc: "A clean, focused view of every service that matters.",
  },
  {
    icon: Zap,
    title: "Fast alerts",
    desc: "Notifications land in seconds, not minutes.",
  },
  {
    icon: TrendingUp,
    title: "Scales as you grow",
    desc: "From one side project to hundreds of production services.",
  },
];

export function WhyPulseWatch() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Why PulseWatch"
          title="Monitoring that gets out of your way"
          subtitle="Built by engineers who got tired of noisy, clunky monitors. PulseWatch is calm, fast, and reliable."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-accent/40 text-emerald-400">
                  <p.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">
                  {p.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.desc}
              </p>
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-6"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl" />
            <h3 className="text-sm font-semibold tracking-tight">
              Ready to start?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Spin up your first monitor in minutes. Free forever for 5 sites.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <Check className="h-4 w-4" /> No credit card required
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

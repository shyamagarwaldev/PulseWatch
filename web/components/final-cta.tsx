"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/50 px-6 py-16 text-center backdrop-blur-xl sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="absolute inset-0 bg-dots opacity-30 mask-fade-b" />
          </div>

          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start monitoring your services in minutes.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">
            Create your first monitor and keep your services online with
            confidence.
          </p>

          <div className="mt-8 flex justify-center">
            <Button size="lg" className="group rounded-full">
              Start Free
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

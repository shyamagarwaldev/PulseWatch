"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { plans } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/features";

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, honest pricing"
          subtitle="Start free. Upgrade when your services need more attention."
        />

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className="relative"
            >
              {plan.highlighted && (
                <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-emerald-500/30 to-transparent" />
              )}
              <Card
                className={cn(
                  "flex h-full flex-col rounded-2xl p-6 backdrop-blur-sm",
                  plan.highlighted
                    ? "border-emerald-500/30 bg-card/70 shadow-xl shadow-emerald-500/5"
                    : "border-border/60 bg-card/40",
                )}
              >
                {plan.highlighted && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="mb-1.5 text-sm text-muted-foreground">
                    {plan.cadence}
                  </span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-foreground/90"
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full",
                          plan.highlighted
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-accent text-muted-foreground",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-2">
                  <Button
                    className={cn(
                      "w-full rounded-full",
                      plan.highlighted
                        ? ""
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

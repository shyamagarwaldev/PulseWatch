"use client";

import { motion, type Variants } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { features } from "@/lib/data";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to keep your services online"
          subtitle="Powerful monitoring primitives, wrapped in an interface that stays out of your way."
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}>
              <Card className="group h-full rounded-2xl border-border/60 bg-card/40 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/70">
                <CardHeader className="p-6">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-accent/40 text-emerald-400 transition-colors group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">
                    {f.title}
                  </h3>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90"
      >
        {eyebrow}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-4 text-pretty text-base text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

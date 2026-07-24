import Link from "next/link";
import { GitBranch, FileText, Shield, Scale, Mail } from "lucide-react";
import { Logo } from "@/components/logo";

const footerLinks = [
  { label: "GitHub", href: "#", icon: GitBranch },
  { label: "Documentation", href: "#", icon: FileText },
  { label: "Privacy", href: "#", icon: Shield },
  { label: "Terms", href: "#", icon: Scale },
  { label: "Contact", href: "#", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {footerLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <l.icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} PulseWatch. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}

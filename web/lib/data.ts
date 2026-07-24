import {
  Activity,
  BellRing,
  Gauge,
  History,
  LayoutGrid,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    icon: Activity,
    title: "24/7 Monitoring",
    description:
      "Monitor your websites continuously with configurable check intervals from every 30 seconds to 5 minutes.",
  },
  {
    icon: BellRing,
    title: "Instant Alerts",
    description:
      "Get notified immediately when downtime or failures are detected — via email, Slack, or webhook.",
  },
  {
    icon: Gauge,
    title: "Uptime Analytics",
    description:
      "Track uptime percentage, response times, and historical performance across all your services.",
  },
  {
    icon: History,
    title: "Incident History",
    description:
      "View previous outages and recovery events in one clean, searchable timeline.",
  },
  {
    icon: LayoutGrid,
    title: "Multiple Website Management",
    description:
      "Monitor all your services from one dashboard with tags, groups, and custom statuses.",
  },
  {
    icon: Zap,
    title: "Fast & Reliable",
    description:
      "Built for reliable, low-latency monitoring with high availability and global probes.",
  },
];

export type Monitor = {
  name: string;
  url: string;
  status: "operational" | "degraded" | "down";
  uptime: number;
  responseTime: number;
  lastChecked: string;
};

export const monitors: Monitor[] = [
  {
    name: "API Gateway",
    url: "api.pulsewatch.io",
    status: "operational",
    uptime: 99.99,
    responseTime: 142,
    lastChecked: "12s ago",
  },
  {
    name: "Marketing Site",
    url: "pulsewatch.io",
    status: "operational",
    uptime: 99.98,
    responseTime: 89,
    lastChecked: "8s ago",
  },
  {
    name: "Dashboard App",
    url: "app.pulsewatch.io",
    status: "degraded",
    uptime: 99.71,
    responseTime: 412,
    lastChecked: "4s ago",
  },
  {
    name: "Webhook Service",
    url: "hooks.pulsewatch.io",
    status: "operational",
    uptime: 100,
    responseTime: 64,
    lastChecked: "2s ago",
  },
  {
    name: "Status Page",
    url: "status.pulsewatch.io",
    status: "operational",
    uptime: 99.95,
    responseTime: 121,
    lastChecked: "15s ago",
  },
];

export type Incident = {
  service: string;
  title: string;
  status: "resolved" | "investigating" | "monitoring";
  time: string;
  duration: string;
};

export const incidents: Incident[] = [
  {
    service: "Dashboard App",
    title: "Elevated response times",
    status: "monitoring",
    time: "2 min ago",
    duration: "ongoing",
  },
  {
    service: "API Gateway",
    title: "Brief timeout on /v1/health",
    status: "resolved",
    time: "1h ago",
    duration: "3m 12s",
  },
  {
    service: "Marketing Site",
    title: "SSL certificate renewed",
    status: "resolved",
    time: "5h ago",
    duration: "0m 0s",
  },
];

export type ResponsePoint = {
  t: string;
  ms: number;
};

export const responseSeries: ResponsePoint[] = [
  { t: "00:00", ms: 120 },
  { t: "02:00", ms: 132 },
  { t: "04:00", ms: 118 },
  { t: "06:00", ms: 145 },
  { t: "08:00", ms: 168 },
  { t: "10:00", ms: 142 },
  { t: "12:00", ms: 155 },
  { t: "14:00", ms: 189 },
  { t: "16:00", ms: 210 },
  { t: "18:00", ms: 174 },
  { t: "20:00", ms: 138 },
  { t: "22:00", ms: 124 },
];

export type Testimonial = {
  name: string;
  role: string;
  initials: string;
  quote: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Staff Engineer, Northwind",
    initials: "SC",
    quote:
      "PulseWatch caught a regression ten minutes before our on-call would have. The response-time charts alone have paid for themselves.",
  },
  {
    name: "Marcus Reid",
    role: "CTO, Lumen Labs",
    initials: "MR",
    quote:
      "We tried three monitors last year. PulseWatch is the first one that feels designed for people who actually ship software.",
  },
  {
    name: "Priya Nair",
    role: "SRE Lead, Cobalt",
    initials: "PN",
    quote:
      "Setup took two minutes. The dashboard is the cleanest I have used, and the alerts land exactly when they should — no noise.",
  },
];

export type Plan = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
};

export const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "/forever",
    description: "Everything you need to watch your side projects.",
    features: ["Up to 5 websites", "Basic monitoring", "Email alerts"],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$24",
    cadence: "/month",
    description: "For teams that run production services at scale.",
    features: [
      "Unlimited websites",
      "Faster checks (30s)",
      "Advanced analytics",
      "Priority alerts (Slack + webhook)",
    ],
    highlighted: true,
    cta: "Get Started",
  },
];

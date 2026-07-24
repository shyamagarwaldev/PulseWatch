import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { DashboardPreview } from "@/components/dashboard-preview";
import { WhyPulseWatch } from "@/components/why-pulsewatch";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <DashboardPreview />
        <WhyPulseWatch />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

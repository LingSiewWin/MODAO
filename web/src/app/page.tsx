import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FutarchySection } from "@/components/landing/FutarchySection";
import { MarketOversightSection } from "@/components/landing/MarketOversightSection";
import { ProposalsPreview } from "@/components/landing/ProposalsPreview";
import { CtaSection } from "@/components/landing/CtaSection";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <FutarchySection />
        <MarketOversightSection />
        <ProposalsPreview />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}

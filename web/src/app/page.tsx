import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FundraisingSection } from "@/components/landing/FundraisingSection";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FutarchySection } from "@/components/landing/FutarchySection";
import { MarketOversightSection } from "@/components/landing/MarketOversightSection";
import { ProposalsPreview } from "@/components/landing/ProposalsPreview";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <HeroSection />
      <FundraisingSection />
      <CommunitySection />
      <FeaturesSection />
      <FutarchySection />
      <MarketOversightSection />
      <ProposalsPreview />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}

import Nav from "../../components/landing/Nav";
import Hero from "../../components/landing/Hero";
import TrustedBy from "../../components/landing/TrustedBy";
import Features from "../../components/landing/Features";
import PricingBand from "../../components/landing/PricingBand";
import Testimonials from "../../components/landing/Testimonials";
import FinalCta from "../../components/landing/FinalCta";
import Footer from "../../components/landing/Footer";
import { landingContent } from "../../content/landing-content";

// This page renders purely from `landingContent` (content/landing-content.js).
// To change any text, number, testimonial, or link on the landing page,
// edit that file — you should not need to touch this file or the section
// components in components/landing/ for content updates.
export default function MarketingPage() {
  return (
    <main className="bg-white">
      <Nav content={landingContent.nav} />
      <Hero content={landingContent.hero} />
      <TrustedBy content={landingContent.trustedBy} />
      <Features content={landingContent.features} />
      <PricingBand content={landingContent.pricingBand} />
      <Testimonials content={landingContent.testimonials} />
      <FinalCta content={landingContent.finalCta} />
      <Footer content={landingContent.footer} />
    </main>
  );
}

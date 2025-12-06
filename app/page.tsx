"use client";

import Header from "../components/Header"; // ✅ Correct
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import StatsSection from "../components/StatsSection";
import BlogSection from "../components/BlogSection";
import NewsletterSection from "../components/NewsletterSection";
import TherapistSection from "../components/TherapistSection";
import PricingSection from "../components/PricingSection";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <BlogSection />
      <NewsletterSection />
      <TherapistSection />
      <PricingSection />
      <Footer />
    </>
  );
}

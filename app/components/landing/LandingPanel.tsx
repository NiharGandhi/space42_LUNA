'use client';

import Navbar from '@/nihar/Navbar';
import Hero from '@/nihar/Hero';
import Features from '@/nihar/Features';
import Careers from '@/nihar/Careers';

/**
 * Space42 landing page — full viewport, modern layout.
 */
export function LandingPanel() {
  return (
    <div className="min-h-screen w-full bg-landing-gradient bg-grain">
      <Navbar />
      <main className="w-full">
        <Hero />
        <Features />
        <Careers />
      </main>
    </div>
  );
}

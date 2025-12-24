"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useAuthModal } from "@/context/AuthModalContext";

export default function HomePage() {
  const { openLogin, openSignup } = useAuthModal();

  // Clear logout flag when homepage loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isLoggingOut');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <Header onLoginClick={openLogin} onSignupClick={openSignup} />
      <main>
        <HeroSection onGetStarted={openSignup} />
        <FeaturesSection />
        <CtaSection onGetStarted={openSignup} />
      </main>
      <Footer />
    </div>
  );
}

function Header({ onLoginClick, onSignupClick }) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Proplytics
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:underline">Features</a>
          <a href="#cta" className="hover:underline">Get Started</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onLoginClick}>Log in</Button>
          <Button onClick={onSignupClick}>Sign up</Button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onGetStarted }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Real estate investment management, reimagined.</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Track performance, analyze deals, and stay organized — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={onGetStarted}>Get started</Button>
            <Link href="/portfolio-summary" className="text-sm underline">View portfolio</Link>
          </div>
        </div>
        <div className="h-64 md:h-80 rounded-xl bg-gradient-to-br from-emerald-300/40 to-teal-300/30 dark:from-emerald-500/10 dark:to-teal-500/10 border border-black/10 dark:border-white/10" />
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard title="Portfolio summary" description="See cash flow, occupancy, and KPIs at a glance." />
        <FeatureCard title="Property records" description="Store income, expenses, and uploads for each property." />
        <FeatureCard title="Calculators" description="Run mortgage, refinance, and penalty calculations quickly." />
        <FeatureCard title="Analytics" description="Understand trends with clean, simple visuals (coming soon)." />
        <FeatureCard title="Calendar" description="Track rent dates, maintenance, and tasks across properties." />
        <FeatureCard title="Secure sync" description="Your data is stored in the cloud and follows you everywhere." />
      </div>
    </section>
  );
}

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5 hover:bg-black/5 dark:hover:bg-white/5 transition">
      <div className="text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function CtaSection({ onGetStarted }) {
  return (
    <section id="cta" className="mx-auto max-w-7xl px-4 py-16">
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center bg-emerald-50/60 dark:bg-emerald-900/10">
        <h2 className="text-2xl font-semibold">Ready to organize your portfolio?</h2>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Create your account in seconds.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onGetStarted}>Get started free</Button>
          <button className="text-sm underline" onClick={onGetStarted}>Or sign up here →</button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-16">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between text-sm">
        <div className="text-gray-600 dark:text-gray-300">© {new Date().getFullYear()} Proplytics</div>
        <div className="flex items-center gap-4">
          <a className="hover:underline" href="#features">Features</a>
          <a className="hover:underline" href="#cta">Get Started</a>
        </div>
      </div>
    </footer>
  );
}



"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  function openLogin() {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  }
  function openSignup() {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  }
  function closeModals() {
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <Header onLoginClick={openLogin} onSignupClick={openSignup} />
      <main>
        <HeroSection onGetStarted={openSignup} />
        <FeaturesSection />
        <CtaSection onGetStarted={openSignup} />
      </main>

      {isLoginOpen && (
        <LoginModal onClose={closeModals} onSwitchToSignup={openSignup} />
      )}
      {isSignupOpen && (
        <SignupModal onClose={closeModals} onSwitchToLogin={openLogin} />
      )}
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
          <Link className="text-sm underline" href="/signup">Or create from the signup page →</Link>
        </div>
      </div>
    </section>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(560px,calc(100vw-32px))] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function LoginModal({ onClose, onSwitchToSignup }) {
  const { addToast } = useToast();
  const { logIn } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      await logIn(email, password);
      addToast("Logged in!", { type: "success" });
      onClose();
      // Redirect to portfolio summary
      window.location.href = "/portfolio-summary";
    } catch (e) {
      const errorMessage = e.message || "Login failed.";
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-semibold">Log in</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Welcome back to Proplytics.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="login-email" className="text-sm">Email</label>
          <input id="login-email" name="email" type="email" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="login-password" className="text-sm">Password</label>
          <input id="login-password" name="password" type="password" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <Button type="submit" loading={loading} className="w-full">Continue</Button>
      </form>
      <div className="mt-4 text-sm">
        Don&apos;t have an account?{" "}
        <button className="underline" onClick={onSwitchToSignup}>Sign up</button>
      </div>
    </Modal>
  );
}

function SignupModal({ onClose, onSwitchToLogin }) {
  const { addToast } = useToast();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      await signUp(email, password, email.split('@')[0]); // Use email prefix as name
      addToast("Account created!", { type: "success" });
      onClose();
      // Redirect to portfolio summary
      window.location.href = "/portfolio-summary";
    } catch (e) {
      const errorMessage = e.message || "Sign up failed.";
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-semibold">Create your account</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Start managing your portfolio.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="signup-email" className="text-sm">Email</label>
          <input id="signup-email" name="email" type="email" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-password" className="text-sm">Password</label>
          <input id="signup-password" name="password" type="password" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
      </form>
      <div className="mt-4 text-sm">
        Already have an account?{" "}
        <button className="underline" onClick={onSwitchToLogin}>Log in</button>
      </div>
    </Modal>
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



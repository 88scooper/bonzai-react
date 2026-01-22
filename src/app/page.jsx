"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[HomePage] Component mounted');
    return () => {
      console.log('[HomePage] Component unmounting');
    };
  }, []);

  // Clear logout flag when homepage loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[HomePage] Clearing logout flag');
      sessionStorage.removeItem('isLoggingOut');
    }
  }, []);

  function openLogin() {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  }
  const openSignup = useCallback(() => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  }, []);
  function closeModals() {
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  }

  // Check for signup query parameter and open signup modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const signupParam = urlParams.get('signup');
      if (signupParam === 'true') {
        openSignup();
        // Clean up URL by removing the query parameter
        window.history.replaceState({}, '', '/');
      }
    }
  }, [openSignup]);

  function handleDemoPortfolio() {
    // Set demo mode flag for read-only access
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoMode', 'true');
      sessionStorage.setItem('readOnlyMode', 'true');
      // Navigate to portfolio summary (no URL params to avoid static generation issues)
      window.location.href = '/portfolio-summary';
    }
  }

  // Debug: Log before render
  console.log('[HomePage] Rendering component');

  try {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
        <Header onLoginClick={openLogin} onSignupClick={openSignup} />
        <main>
          <HeroSection onGetStarted={openSignup} onDemoPortfolio={handleDemoPortfolio} />
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
  } catch (error) {
    console.error('[HomePage] Error during render:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error loading homepage</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <pre className="mt-4 text-xs text-left bg-gray-100 p-4 rounded">{error.stack}</pre>
        </div>
      </div>
    );
  }
}

function Header({ onLoginClick, onSignupClick }) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" prefetch={false} className="font-semibold tracking-tight">
          Bonzai
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

function HeroSection({ onGetStarted, onDemoPortfolio }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Institutional-grade data for the independent landlord.</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            You don't need to be a finance expert to run a professional portfolio. Bonzai gives you a clear, accessible way to centralize your data and stop guessing your returns. Whether you're currently using a spreadsheet or nothing at all, we give you the instant insight you need to track cash flow and see your equity grow in real-time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={onGetStarted} className="!px-8 !py-4 !text-lg">Get started for free</Button>
            <Button onClick={onDemoPortfolio} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 dark:bg-emerald-500 dark:hover:bg-emerald-600 !px-8 !py-4 !text-lg">View the Demo Portfolio</Button>
          </div>
        </div>
        <div className="h-64 md:h-80 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 flex items-center justify-center">
          <Image
            src="/bonzai-logo.png"
            alt="Bonzai - Real Estate Investment Management"
            width={720}
            height={480}
            className="w-full h-full object-contain p-4 scale-110"
            priority
          />
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Real estate is often your biggest investment, yet the "real numbers" usually stay buried in a shoebox of receipts or a spreadsheet that hasn't been updated in months. If you can't see your actual cash flow and equity, you're missing the insights that help you grow. Bonzai replaces that uncertainty with total clarity.</h2>
      </div>
      
      <div className="space-y-16 md:space-y-20">
        {/* Seamless Portfolio Transparency & Management */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Seamless Portfolio Transparency & Management</h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard title="Portfolio transparency & tracking" description="Get a complete view of your portfolio with cash flow, occupancy rates, cap rates, and key performance indicators. Compare actual performance against forecasts and track revenue, tax deductible expenses, and cash flow growth trends." />
            <FeatureCard title="Track equity growth" description="Project your property's equity growth by modeling appreciation, interest rates, and principal paydown over time." />
            <FeatureCard title="Calendar & tasks" description="Track rent collection dates, maintenance schedules, and important tasks across all your properties." />
          </div>
        </div>

        {/* Powerful Analysis, Insights, and Forecasting */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Powerful Analysis, Insights, and Forecasting</h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard title="Portfolio insights" description="Get actionable intelligence on top-performing properties, diversification opportunities, and risk assessment." />
            <FeatureCard title="10-year forecasting" description="Project cash flow and equity growth over 10 years with adjustable assumptions for rent growth, expenses, appreciation, and vacancy rates." />
            <FeatureCard title="Sensitivity analysis" description="Model different market scenarios by adjusting assumptions and instantly see the impact on IRR, cash flow, and total profit." />
            <FeatureCard title="Scenario planning" description="No more repetitve data entry - save and compare multiple investment scenarios to model optimistic, realistic, and conservative market conditions side-by-side." />
          </div>
        </div>

        {/* Consolidation of Property Details & Data */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Consolidation of Property Details & Data</h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard title="Property records & secure cloud sync" description="Centralized property management with income tracking, expense records, document storage, and historical data, all securely stored in the cloud and automatically synced across all your devices." />
            <FeatureCard title="Mortgage management" description="Track all mortgages, view detailed amortization schedules, calculate refinancing opportunities, and analyze break penalties." />
            <FeatureCard title="Advanced calculators" description="Mortgage payment calculators, refinance analysis, break penalty calculations, and comprehensive payment schedules." />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, description }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="group relative rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 hover:border-emerald-300/50 dark:hover:border-emerald-500/30 hover:shadow-lg transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <div className="text-lg font-semibold flex-1 text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {title}
        </div>
        <div className={`flex-shrink-0 p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 transition-all duration-200 ${
          isExpanded ? "bg-emerald-100 dark:bg-emerald-900/40" : ""
        }`}>
          <ChevronDown
            className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      <div className="mt-4">
        {isExpanded ? (
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}

function CtaSection({ onGetStarted }) {
  return (
    <section id="cta" className="mx-auto max-w-7xl px-4 py-16">
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center bg-emerald-50/60 dark:bg-emerald-900/10">
        <h2 className="text-2xl font-semibold">Ready to optimize your real estate investments?</h2>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Start gaining transparency into your portfolio and make data-driven investment decisions.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onGetStarted}>Get started for free</Button>
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
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      const userData = await logIn(email, password);
      addToast("Logged in!", { type: "success" });
      onClose();
      // Redirect based on user role - admins go to admin page, others to portfolio summary
      setTimeout(() => {
        const redirectPath = userData?.isAdmin ? "/admin" : "/portfolio-summary";
        window.location.href = redirectPath;
      }, 100);
    } catch (e) {
      let errorMessage = "Login failed.";
      if (e.message) {
        if (e.message.includes("Invalid email or password") || e.message.includes("401")) {
          errorMessage = "Invalid email or password.";
        } else {
          errorMessage = e.message;
        }
      }
      setError(errorMessage);
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-semibold">Log in</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Welcome back to Bonzai.</p>
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="login-email" className="text-sm">Email</label>
          <input id="login-email" name="email" type="email" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="login-password" className="text-sm">Password</label>
          <div className="relative">
            <input 
              id="login-password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required 
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
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
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      const name = String(form.get("name") || email.split('@')[0] || "");
      
      await signUp(email, password, name || null);
      // Clear demo mode flag immediately after signup to prevent demo data from loading
      // Set onboarding_in_progress flag to prevent redirect to portfolio-summary
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demoMode');
        sessionStorage.removeItem('readOnlyMode');
        sessionStorage.setItem('onboarding_in_progress', 'true');
      }
      addToast("Account created!", { type: "success" });
      onClose();
      // Redirect to onboarding for new users
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 100);
    } catch (e) {
      let errorMessage = "Sign up failed.";
      if (e.message) {
        if (e.message.includes("already exists") || e.message.includes("duplicate") || e.message.includes("409")) {
          errorMessage = "An account with this email already exists.";
        } else if (e.message.includes("Validation failed")) {
          errorMessage = e.message.replace("Validation failed: ", "");
        } else {
          errorMessage = e.message;
        }
      }
      setError(errorMessage);
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-semibold">Create your account</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Start managing your portfolio.</p>
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="signup-name" className="text-sm">Full name (optional)</label>
          <input id="signup-name" name="name" type="text" className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-email" className="text-sm">Email</label>
          <input id="signup-email" name="email" type="email" required className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-password" className="text-sm">Password</label>
          <div className="relative">
            <input 
              id="signup-password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required 
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
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




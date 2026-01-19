"use client";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-auto bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Disclaimer */}
        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          <p>
            Bonzai is a software tool designed for informational and educational purposes only. The calculations, projections, and metrics provided (including Cap Rate, NOI, and Cash-on-Cash Return) are based on user-inputted data and mathematical formulas. Bonzai does not provide financial, investment, legal, or tax advice. We recommend consulting with a qualified professional (such as a CPA, lawyer, or certified financial planner) before making any investment decisions.
          </p>
        </div>
        
        {/* Copyright and Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-300">
          <div>© {new Date().getFullYear()} Bonzai</div>
          <div className="flex items-center gap-4">
            <a className="hover:underline" href="#features">Features</a>
            <a className="hover:underline" href="#cta">Get Started</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

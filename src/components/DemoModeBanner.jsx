"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";

export default function DemoModeBanner() {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check for demo mode on client side only to avoid hydration mismatch
  // Only use sessionStorage to avoid any URL search param issues during static generation
  // NOTE: We explicitly avoid using useSearchParams() here to prevent build errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If user is authenticated, don't show demo mode
      // Also check if current account is marked as demo
      if (user && currentAccount) {
        // Real authenticated user - check if account is demo account
        const isDemo = currentAccount.isDemo === true;
        setIsDemoMode(isDemo);
      } else if (!user) {
        // Not authenticated - check sessionStorage
        const demo = sessionStorage.getItem('demoMode') === 'true';
        setIsDemoMode(demo);
      } else {
        // User is authenticated but account not loaded yet
        setIsDemoMode(false);
      }
    }
  }, [user, currentAccount]);

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <div className="absolute h-2 w-2 rounded-full bg-[#205A3E] animate-pulse"></div>
              <div className="absolute h-2 w-2 rounded-full bg-[#205A3E]/40 animate-ping"></div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#205A3E] dark:text-[#66B894]">DEMO MODE</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">You're viewing a read-only demo portfolio.</span>
        </div>
        <a 
          href="/?signup=true" 
          className="text-xs font-semibold px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Create Account
        </a>
      </div>
    </div>
  );
}

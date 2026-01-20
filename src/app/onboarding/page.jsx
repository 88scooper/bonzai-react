"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth, useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, isNewUser, checkIsNewUser } = useAuth();
  const { accounts, loading: accountsLoading } = useAccount();
  const onboardingStartedRef = useRef(false);

  useEffect(() => {
    // Mark that onboarding has started once the wizard is shown
    // Also mark it if onboarding is already in progress (to prevent resets)
    const onboardingInProgress = typeof window !== 'undefined' && 
      sessionStorage.getItem('onboarding_in_progress') === 'true';
    
    if (onboardingInProgress) {
      onboardingStartedRef.current = true;
    } else if (user && !authLoading && accountsLoading === false && Array.isArray(accounts) && accounts.length === 0) {
      onboardingStartedRef.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboarding_in_progress', 'true');
      }
    }
  }, [user, authLoading, accountsLoading, accounts]);

  useEffect(() => {
    // Check if user should be on onboarding page
    const checkAccess = async () => {
      // Wait for both auth and accounts to finish loading
      if (authLoading || accountsLoading) {
        return;
      }

      // If not authenticated, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if onboarding is in progress (user is actively going through the wizard)
      const onboardingInProgress = onboardingStartedRef.current || 
        (typeof window !== 'undefined' && sessionStorage.getItem('onboarding_in_progress') === 'true');

      // Only redirect if accounts have explicitly finished loading AND user has accounts (excluding demo accounts)
      // AND onboarding is not currently in progress
      const nonDemoAccounts = Array.isArray(accounts) ? accounts.filter(acc => !acc.isDemo) : [];
      if (accountsLoading === false && nonDemoAccounts.length > 0 && !onboardingInProgress) {
        // User has accounts and is not in active onboarding, redirect to portfolio
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('onboarding_in_progress');
        }
        router.push("/portfolio-summary");
        return;
      }
    };

    checkAccess();
  }, [user, authLoading, accountsLoading, accounts, router]);

  // Show loading state
  if (authLoading || accountsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if onboarding is in progress
  const onboardingInProgress = onboardingStartedRef.current || 
    (typeof window !== 'undefined' && sessionStorage.getItem('onboarding_in_progress') === 'true');

  // Show onboarding wizard if:
  // 1. User is authenticated
  // 2. Both auth and accounts have finished loading
  // 3. Either accounts array is empty (new user) OR onboarding is in progress
  if (user && !authLoading && accountsLoading === false) {
    // Filter out demo accounts - we only care about real user accounts
    const nonDemoAccounts = Array.isArray(accounts) ? accounts.filter(acc => !acc.isDemo) : [];
    // Show wizard if no real accounts exist OR if onboarding is actively in progress
    // IMPORTANT: Always show wizard if onboarding is in progress, even if accounts exist
    // This prevents the wizard from being unmounted when an account is created
    if (nonDemoAccounts.length === 0 || onboardingInProgress) {
      return (
        <RequireAuth>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <OnboardingWizard 
                key="onboarding-wizard" 
                onComplete={() => {
                  // Clear onboarding flag when wizard completes
                  onboardingStartedRef.current = false;
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('onboarding_in_progress');
                  }
                }} 
              />
            </div>
            <Footer />
          </div>
        </RequireAuth>
      );
    }
    // If accounts exist and onboarding is not in progress, the useEffect will handle redirect
    // Return null while redirect happens
    return null;
  }

  // Still loading - show loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}


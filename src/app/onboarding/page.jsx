"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth, useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, isNewUser, checkIsNewUser } = useAuth();
  const { accounts, loading: accountsLoading } = useAccount();
  const onboardingStartedRef = useRef(false);

  useEffect(() => {
    // Mark that onboarding has started once the wizard is shown
    if (user && !authLoading && accountsLoading === false && Array.isArray(accounts) && accounts.length === 0) {
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

      // Only redirect if accounts have explicitly finished loading AND user has accounts
      // AND onboarding is not currently in progress
      if (accountsLoading === false && Array.isArray(accounts) && accounts.length > 0 && !onboardingInProgress) {
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
    // Show wizard if accounts is empty OR if onboarding is actively in progress
    if (Array.isArray(accounts) && (accounts.length === 0 || onboardingInProgress)) {
      return (
        <RequireAuth>
          <OnboardingWizard onComplete={() => {
            // Clear onboarding flag when wizard completes
            onboardingStartedRef.current = false;
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('onboarding_in_progress');
            }
          }} />
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


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth, useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, isNewUser, checkIsNewUser } = useAuth();
  const { accounts, loading: accountsLoading } = useAccount();

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

      // Only redirect if accounts have explicitly finished loading AND user has accounts
      // Important: accounts should be an empty array [] for new users, not undefined
      if (accountsLoading === false && Array.isArray(accounts) && accounts.length > 0) {
        // User has accounts, redirect to portfolio
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

  // Only show onboarding if accounts have loaded and are empty
  // If accounts exist, the useEffect will redirect (return null while redirecting)
  if (Array.isArray(accounts) && accounts.length > 0) {
    return null; // Will redirect via useEffect
  }

  // Show onboarding wizard if:
  // 1. User is authenticated
  // 2. Both auth and accounts have finished loading
  // 3. Accounts array is empty (or doesn't exist yet, but loading is done)
  if (user && !authLoading && accountsLoading === false) {
    // Only show if accounts is empty array (new user)
    if (Array.isArray(accounts) && accounts.length === 0) {
      return (
        <RequireAuth>
          <OnboardingWizard />
        </RequireAuth>
      );
    }
    // If accounts.length > 0, the useEffect will handle redirect
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


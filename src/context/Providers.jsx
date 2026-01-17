"use client";

import { useEffect, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { AccountProvider } from "@/context/AccountContext";
import { PropertyProvider } from "@/context/PropertyContext";
import { MortgageProvider } from "@/context/MortgageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { queryClient } from "@/lib/query-client";
import { migrateLocalStorageKeys } from "@/lib/migrate-localStorage-keys";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Providers({ children }) {
  // Debug: Log provider initialization
  useEffect(() => {
    console.log('[Providers] Initializing providers');
  }, []);

  // Run localStorage migration once on mount
  useEffect(() => {
    console.log('[Providers] Running localStorage migration');
    try {
      migrateLocalStorageKeys();
      console.log('[Providers] LocalStorage migration complete');
    } catch (error) {
      console.error('[Providers] Error during localStorage migration:', error);
    }
  }, []);

  console.log('[Providers] Rendering provider tree');
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading providers...</div>}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthModalProvider>
              <AccountProvider>
              <SettingsProvider>
                <ToastProvider>
                  <PropertyProvider>
                    <MortgageProvider>
                      {children}
                    </MortgageProvider>
                  </PropertyProvider>
                </ToastProvider>
              </SettingsProvider>
              </AccountProvider>
            </AuthModalProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  );
}



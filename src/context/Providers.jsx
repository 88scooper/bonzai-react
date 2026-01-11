"use client";

import { useEffect } from 'react';
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

export default function Providers({ children }) {
  // Run localStorage migration once on mount
  useEffect(() => {
    migrateLocalStorageKeys();
  }, []);
  return (
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
  );
}



"use client";

import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { AccountProvider } from "@/context/AccountContext";
import { PropertyProvider } from "@/context/PropertyContext";
import { MortgageProvider } from "@/context/MortgageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { queryClient } from "@/lib/query-client";

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}



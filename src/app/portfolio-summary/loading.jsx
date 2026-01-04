"use client";

import Layout from "@/components/Layout.jsx";
import { RequireAuth } from "@/context/AuthContext";

export default function Loading() {
  return (
    <RequireAuth>
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading portfolio...</p>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}


"use client";

// Simplified loading component to avoid auth checks during route transitions
// This prevents "Failed to fetch" errors during navigation
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading portfolio...</p>
      </div>
    </div>
  );
}


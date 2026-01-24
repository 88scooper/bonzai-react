"use client";

// Loading component for portfolio summary with skeleton screens
// Provides better UX during cold starts and data fetching
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Properties List Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded">
                <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


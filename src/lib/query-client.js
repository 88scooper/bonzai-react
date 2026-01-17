import { QueryClient } from '@tanstack/react-query';

/**
 * Stale time constants (in milliseconds)
 * Optimized for real estate data that changes infrequently
 */
export const STALE_TIMES = {
  // Properties and mortgages change rarely - cache for 30 minutes
  PROPERTIES: 30 * 60 * 1000,
  MORTGAGES: 30 * 60 * 1000,
  ACCOUNTS: 30 * 60 * 1000,
  // Expenses may be updated more frequently - 5 minutes
  EXPENSES: 5 * 60 * 1000,
  // Analytics/calculations are computed values - 1 minute
  ANALYTICS: 1 * 60 * 1000,
  CALCULATIONS: 1 * 60 * 1000,
  // Default fallback for unknown query types
  DEFAULT: 5 * 60 * 1000,
};

// Create a client with optimized stale times for real estate data
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time: 5 minutes (conservative default)
      staleTime: STALE_TIMES.DEFAULT,
      // Keep in cache for 20 minutes (increased from 10)
      gcTime: 20 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * Helper function to create query options with optimized stale times
 * Usage: useQuery({ ...queryOptions(['properties'], getProperties, { staleTime: getStaleTime('PROPERTIES') }) })
 */
export function getStaleTime(queryType) {
  return STALE_TIMES[queryType] || STALE_TIMES.DEFAULT;
}

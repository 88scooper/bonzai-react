export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-[#205A3E] mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-[#205A3E] rounded-full opacity-75"></div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">
          Loading Bonzai...
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Preparing your dashboard
        </p>
      </div>
    </div>
  );
}

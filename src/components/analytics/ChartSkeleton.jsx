"use client";

/**
 * ChartSkeleton Component
 * Shimmer effect skeleton for charts - makes app feel faster than it is
 * Shows grey "ghost" version of chart that shimmers during loading
 */
export default function ChartSkeleton() {
  return (
    <div className="space-y-4 relative overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      
      {/* Chart Area with shimmer */}
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl relative overflow-hidden">
        {/* Shimmer overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5 pointer-events-none"
          style={{
            animation: 'shimmer 2s infinite',
            transform: 'translateX(-100%)'
          }}
        ></div>
        {/* Simulated chart lines */}
        <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`grid-h-${i}`}
              x1="0"
              y1={80 + i * 60}
              x2="800"
              y2={80 + i * 60}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="dark:stroke-gray-700"
            />
          ))}
          {/* Simulated data line */}
          <path
            d="M 50 300 Q 200 250, 350 200 T 650 150 T 750 100"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="3"
            className="dark:stroke-gray-600"
          />
        </svg>
      </div>
      
      {/* Legend skeleton */}
      <div className="flex gap-4 justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  );
}


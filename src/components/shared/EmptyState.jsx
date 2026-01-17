"use client";

import Button from "@/components/Button";

/**
 * EmptyState Component
 * Branded empty state with minimalist Bonsai tree illustration
 * Turns functional "errors" into premium brand moments
 */
export default function EmptyState({ 
  title, 
  description, 
  actionLabel = "Get Started", 
  onAction,
  icon: CustomIcon 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Minimalist Bonsai tree SVG illustration */}
      <svg 
        className="w-32 h-32 text-gray-300 dark:text-gray-700 mb-6" 
        viewBox="0 0 100 100" 
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Trunk */}
        <path 
          d="M50 80 L50 50" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        {/* Main branches */}
        <path 
          d="M40 60 L50 50 L60 60" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        <path 
          d="M35 55 L50 50 L45 45" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        <path 
          d="M65 55 L50 50 L55 45" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        {/* Foliage circles - minimalist style */}
        <circle cx="40" cy="40" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="60" cy="35" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="35" cy="35" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="65" cy="40" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        {/* Pot base */}
        <rect x="40" y="80" width="20" height="5" rx="1" fill="currentColor" opacity="0.3"/>
      </svg>
      
      {CustomIcon && (
        <div className="mb-4">
          <CustomIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
        {description}
      </p>
      {onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

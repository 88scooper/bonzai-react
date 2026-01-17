"use client";

import Button from "@/components/Button";

/**
 * ListPageHeader Component
 * Mercury-style white card header for list pages
 * Clean, minimal design with Bonzai Green accent button
 */
export default function ListPageHeader({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  actionIcon: ActionIcon,
  className = ""
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-6 mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-hero-4xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {onAction && actionLabel && (
          <div className="flex-shrink-0">
            <Button variant="primary" onClick={onAction}>
              {ActionIcon && <ActionIcon className="w-5 h-5" />}
              <span>{actionLabel}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

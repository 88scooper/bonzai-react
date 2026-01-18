"use client";

import { Pencil } from 'lucide-react';

/**
 * PropertyHeader Component
 * Prominent Bonzai Green banner header for property detail pages
 * Features property name, address, and edit button
 * Mercury + Bonzai Green aesthetic
 */
export default function PropertyHeader({ 
  property, 
  onEdit,
  className = ""
}) {
  const propertyName = property?.nickname || property?.name || 'Property';
  const propertyAddress = property?.address || '';

  return (
    <div className={`relative bg-[#205A3E] dark:bg-[#1a4932] rounded-t-xl overflow-hidden mb-6 ${className}`}>
      {/* Subtle texture/gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#205A3E]/95 to-[#1a4932]/95 dark:from-[#1a4932]/95 dark:to-[#0f2f1f]/95"></div>
      
      <div className="relative px-6 py-[16.2px] md:px-8 md:py-[22.68px]">
        <div className="flex items-start gap-4 md:gap-6">
          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-hero-5xl font-bold text-white mb-1 leading-tight">
              {propertyName}
            </h1>
            {propertyAddress && (
              <p className="text-base md:text-lg text-white/90 dark:text-white/80 mb-3">
                {propertyAddress}
              </p>
            )}
          </div>
          
          {/* Edit Button */}
          {onEdit && (
            <div className="flex-shrink-0">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                aria-label="Edit property"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

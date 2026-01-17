"use client";

import { Pencil } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

/**
 * PropertyHeader Component
 * Prominent Bonzai Green banner header for property detail pages
 * Features property thumbnail, name, address, and edit button
 * Mercury + Bonzai Green aesthetic
 */
export default function PropertyHeader({ 
  property, 
  onEdit,
  imageUrl,
  className = ""
}) {
  const [imageError, setImageError] = useState(false);
  
  const propertyName = property?.nickname || property?.name || 'Property';
  const propertyAddress = property?.address || '';
  
  // Helper function to get property image URL (similar to PropertyCard)
  const getPropertyImageUrl = () => {
    if (imageUrl) return imageUrl;
    if (property?.imageUrl) return property.imageUrl;
    
    // Try to construct from address
    if (property?.address) {
      const addressMatch = property.address.match(/^(\d+)(?:[-\s]*\d*)?\s+(.+?)(?:,|$)/);
      if (addressMatch) {
        const firstNumber = addressMatch[1];
        const street = addressMatch[2].trim();
        
        let streetAbbr = street
          .replace(/\bAvenue\b/gi, 'Ave')
          .replace(/\bStreet\b/gi, 'St')
          .replace(/\bDrive\b/gi, 'Dr')
          .replace(/\bWay\b/gi, 'Way')
          .replace(/\bBoulevard\b/gi, 'Blvd')
          .replace(/\bRoad\b/gi, 'Rd')
          .replace(/\bEast\b/gi, 'E')
          .replace(/\bWest\b/gi, 'W')
          .replace(/\bNorth\b/gi, 'N')
          .replace(/\bSouth\b/gi, 'S');
        
        const imageName = `${firstNumber} ${streetAbbr}`.trim();
        return `/images/${imageName}.png`;
      }
    }
    
    return null;
  };
  
  const propertyImage = getPropertyImageUrl();

  return (
    <div className={`relative bg-[#205A3E] dark:bg-[#1a4932] rounded-t-xl overflow-hidden mb-6 ${className}`}>
      {/* Subtle texture/gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#205A3E]/95 to-[#1a4932]/95 dark:from-[#1a4932]/95 dark:to-[#0f2f1f]/95"></div>
      
      <div className="relative px-6 py-6 md:px-8 md:py-8">
        <div className="flex items-start gap-4 md:gap-6">
          {/* Property Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-white/10 dark:bg-white/5">
              {propertyImage && !imageError ? (
                <Image
                  src={`${propertyImage}?v=3`}
                  alt={propertyName}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <span className="text-white/60 text-lg font-semibold">
                    {propertyName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-hero-5xl font-bold text-white mb-1 leading-tight">
              {propertyName}
            </h1>
            {propertyAddress && (
              <p className="text-base md:text-lg text-white/90 dark:text-white/80 mb-4">
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

"use client";

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * CopyableValue Component
 * Displays a financial value with a hover-to-copy functionality
 * Makes the app feel like a "power tool" for investors
 */
export default function CopyableValue({ value, label, className = "" }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className={`group relative inline-flex items-center gap-1 ${className}`}>
      <span className="font-semibold tabular-nums">{value}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:opacity-100"
        aria-label={`Copy ${label || value}`}
        title={`Copy ${label || value}`}
      >
        {copied ? (
          <Check className="w-4 h-4 text-[#205A3E] dark:text-[#66B894]" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        )}
      </button>
    </div>
  );
}

"use client";

import { motion, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * AnimatedFinancialValue Component
 * Displays financial values with smooth rolling/counting animation
 * Creates high-end, tactile feeling when values update
 * Uses Framer Motion for number transitions (no snapping)
 */
export default function AnimatedFinancialValue({ 
  value, 
  formatFn = (val) => val,
  className = "",
  ...props 
}) {
  // Parse numeric value from formatted string or number
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : parseFloat(value) || 0;

  const motionValue = useMotionValue(numericValue);
  const spring = useSpring(motionValue, { 
    stiffness: 100, 
    damping: 30
  });

  const [displayValue, setDisplayValue] = useState(() => formatFn(numericValue));

  // Subscribe to spring value changes
  useMotionValueEvent(spring, 'change', (latest) => {
    const rounded = Math.round(latest * 100) / 100;
    setDisplayValue(formatFn(rounded));
  });

  useEffect(() => {
    motionValue.set(numericValue);
  }, [numericValue, motionValue]);

  return (
    <motion.span 
      className={`font-semibold tabular-nums ${className}`}
      {...props}
    >
      {displayValue}
    </motion.span>
  );
}

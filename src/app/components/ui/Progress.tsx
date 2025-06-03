'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Progress Component
 * - Accessible progress bars with WCAG AA compliance
 * - Support for different colors and sizes
 * - Labels for screenreaders
 */

import React from 'react';

type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';
type ProgressColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressProps {
  value: number; // Value between 0-100
  max?: number; // Maximum value (default 100)
  size?: ProgressSize;
  color?: ProgressColor;
  showValue?: boolean;
  label?: string;
  className?: string;
  valueFormatter?: (value: number, max: number) => string;
}

/**
 * Accessible progress bar component that follows WCAG AA guidelines
 */
export function Progress({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showValue = false,
  label,
  className = '',
  valueFormatter,
}: ProgressProps) {
  // Normalize value to be between 0 and max
  const normalizedValue = Math.min(Math.max(0, value), max);
  // Calculate percentage
  const percentage = (normalizedValue / max) * 100;

  // Height based on size
  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Colors for the progress bar
  const colorClasses = {
    primary: 'bg-primary-600',
    secondary: 'bg-secondary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  
  // Dynamic color based on value (useful for things like password strength)
  const getDynamicColor = () => {
    if (percentage < 33) return 'bg-red-600';
    if (percentage < 66) return 'bg-yellow-500';
    return 'bg-green-600';
  };
  
  // Use dynamic color if color is not specified
  const barColor = color === 'primary' && !label ? getDynamicColor() : colorClasses[color];

  // Format the displayed value
  const formattedValue = valueFormatter
    ? valueFormatter(normalizedValue, max)
    : `${Math.round(percentage)}%`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showValue && (
            <span className="text-sm font-medium text-gray-700">{formattedValue}</span>
          )}
        </div>
      )}
      
      <div 
        className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div 
          className={`${barColor} rounded-full ${sizeClasses[size]} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      {!label && showValue && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {formattedValue}
        </div>
      )}
    </div>
  );
}

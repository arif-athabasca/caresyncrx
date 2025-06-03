'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Badge Component
 * - Visual indicator for status, counts, or categories
 * - WCAG AA compliant color contrast
 * - Multiple variants and sizes
 */

import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Badge component used to highlight status, categories, or counts
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  icon,
  className = '',
}: BadgeProps) {
  // Determine background color based on variant
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  };
  
  // Determine size classes
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5 leading-none',
    sm: 'text-xs px-2 py-1 leading-none',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  // Determine border radius
  const roundedClass = rounded ? 'rounded-full' : 'rounded';
  
  return (
    <span 
      className={`inline-flex items-center ${roundedClass} font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon && (
        <span className="mr-1 -ml-0.5 inline-flex">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

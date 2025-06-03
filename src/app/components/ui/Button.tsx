'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Clinical Button Component
 * - WCAG AA compliant accessible button
 * - Mobile-friendly with touch targets
 * - Uses clinical blues palette from Tailwind config
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'critical';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ['aria-label']?: string;
  as?: React.ElementType; // For polymorphic components like Link
  href?: string; // For Link components
}

/**
 * Clinical Button component that follows WCAG AA accessibility guidelines
 * Supports polymorphic rendering (as="a" or as={Link})
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  icon,
  iconPosition = 'left',
  onClick,
  className = '',
  'aria-label': ariaLabel,
  as: Component = 'button',
  href,
  ...props
}: ButtonProps) {
  // Base classes - these apply to all variants
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500";
  
  // Determine size classes
  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-4 py-2 text-base",
    xl: "px-6 py-3 text-base"
  };
  
  // Determine variant classes - include accessible color combinations
  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300",
    secondary: "bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800 disabled:bg-secondary-300",
    outline: "bg-white text-primary-700 border border-primary-500 hover:bg-primary-50 active:bg-primary-100 disabled:text-gray-400 disabled:border-gray-300",
    text: "bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:text-gray-400",
    critical: "bg-critical text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300"
  };
  
  // Handle width
  const widthClass = fullWidth ? "w-full" : "";
  
  // Disabled and loading states
  const stateClasses = disabled || isLoading ? "cursor-not-allowed" : "cursor-pointer";
  
  // Compose classes
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${stateClasses} ${className}`;
  
  // Determine gap based on size
  const gapSize = {
    xs: "gap-1",
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2",
    xl: "gap-3"
  };
  
  // Set common props
  const commonProps = {
    className: classes,
    disabled: disabled || isLoading,
    onClick,
    'aria-label': ariaLabel,
    'aria-busy': isLoading,
    href: Component !== 'button' ? href : undefined,
    type: Component === 'button' ? type : undefined,
    ...props
  };
    return (
    <Component
      {...commonProps}
    >
      {isLoading && (
        <span className="inline-block animate-spin-slow mr-2">
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}

      {/* Icon positioning */}
      {icon && iconPosition === 'left' && !isLoading && (
        <span className={`inline-block ${gapSize[size]}`}>{icon}</span>
      )}

      {/* Button label */}
      {children}

      {/* Right-positioned icon */}
      {icon && iconPosition === 'right' && (
        <span className={`inline-block ${gapSize[size]}`}>{icon}</span>
      )}
    </Component>
  );
}

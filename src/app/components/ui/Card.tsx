'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Clinical Card Component
 * - Responsive card for clinical data display
 * - WCAG AA compliant color contrast
 * - Supports various status indicators
 */

import React from 'react';

type CardStatus = 'default' | 'success' | 'warning' | 'critical' | 'info';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  status?: CardStatus;
  compact?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * Clinical Card component for displaying content in a contained surface
 */
export function Card({
  title,
  subtitle,
  children,
  footer,
  status = 'default',
  compact = false,
  className = '',
  headerAction,
}: CardProps) {
  // Status indicator classes
  const statusClasses = {
    default: '',
    success: 'border-l-4 border-success',
    warning: 'border-l-4 border-warning',
    critical: 'border-l-4 border-critical',
    info: 'border-l-4 border-info'
  };
  
  // Padding based on compact mode
  const paddingClasses = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6';
  
  return (
    <div className={`bg-white rounded-lg shadow-sm ${statusClasses[status]} ${className}`}>
      {/* Card Header */}
      {(title || subtitle || headerAction) && (
        <div className={`border-b border-gray-200 ${paddingClasses} flex justify-between items-start`}>
          <div>
            {title && (
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          
          {headerAction && (
            <div className="ml-4">{headerAction}</div>
          )}
        </div>
      )}
      
      {/* Card Body */}
      <div className={paddingClasses}>
        {children}
      </div>
      
      {/* Card Footer */}
      {footer && (
        <div className={`border-t border-gray-200 ${paddingClasses}`}>
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * Clinical metric card to display key values with labels
 */
export function MetricCard({
  label,
  value,
  change,
  trend = 'neutral',
  icon,
  className = '',
}: {
  label: string;
  value: string | number;
  change?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}) {
  const trendColors = {
    up: 'text-success',
    down: 'text-critical',
    neutral: 'text-gray-500'
  };
  
  return (
    <Card compact className={className}>
      <div className="flex items-center">
        {icon && (
          <div className="mr-4 flex-shrink-0 rounded-full bg-primary-100 p-3">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className={`ml-2 text-sm font-medium ${trendColors[trend]}`}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}
                {change}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

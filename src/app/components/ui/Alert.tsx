'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Alert Component
 * - Accessible alert messages with WCAG AA compliance
 * - Different severity levels with appropriate colors
 * - Supports dismissal and icons
 */

import React from 'react';

type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  children: React.ReactNode;
  severity?: AlertSeverity;
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

/**
 * Clinical Alert component for displaying important messages to users
 */
export function Alert({
  children,
  severity = 'info',
  title,
  icon,
  onClose,
  className = '',
}: AlertProps) {
  // Determine the appropriate colors based on severity
  const severityClasses = {
    info: 'bg-primary-50 border-primary-200 text-primary-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };
  
  // Icon colors
  const iconColors = {
    info: 'text-primary-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };
  
  // Default icons if none provided
  const defaultIcons = {
    info: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };
  
  // Use default icons if none provided
  const alertIcon = icon || defaultIcons[severity];

  return (
    <div 
      className={`rounded-md p-4 border ${severityClasses[severity]} ${className}`}
      role="alert"
    >
      <div className="flex">
        {alertIcon && (
          <div className="flex-shrink-0">
            <span className={`${iconColors[severity]}`}>
              {alertIcon}
            </span>
          </div>
        )}
        <div className="ml-3">
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          <div className={`${title ? 'mt-2' : ''} text-sm`}>
            {children}
          </div>
        </div>
        
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${severity === 'info' ? 'bg-primary-100 text-primary-500 hover:bg-primary-200 focus:ring-primary-600' : ''}
                  ${severity === 'success' ? 'bg-green-100 text-green-500 hover:bg-green-200 focus:ring-green-600' : ''}
                  ${severity === 'warning' ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200 focus:ring-yellow-600' : ''}
                  ${severity === 'error' ? 'bg-red-100 text-red-500 hover:bg-red-200 focus:ring-red-600' : ''}
                `}
                onClick={onClose}
                aria-label="Dismiss"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

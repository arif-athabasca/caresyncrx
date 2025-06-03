'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Tooltip Component
 * - WCAG AA compliant accessible tooltip
 * - Multiple positions (top, right, bottom, left)
 * - Follows accessibility best practices
 */

import React, { useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  maxWidth?: string;
  isDisabled?: boolean;
}

/**
 * Accessible tooltip component that follows WCAG AA guidelines
 */
export function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  className = '',
  maxWidth = '250px',
  isDisabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Position the tooltip based on the trigger element
  const positionTooltip = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // Calculate position based on selected position
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.top - tooltipRect.height - 10;
        break;
      case 'right':
        x = triggerRect.right + 10;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.bottom + 10;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 10;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
    }
    
    // Boundary checking to keep tooltip in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Keep tooltip within horizontal viewport
    x = Math.min(Math.max(10, x), viewportWidth - tooltipRect.width - 10);
    
    // Keep tooltip within vertical viewport
    y = Math.min(Math.max(10, y), viewportHeight - tooltipRect.height - 10);
    
    setCoords({ x, y });
  };
  
  // Show tooltip with delay
  const showTooltip = () => {
    if (isDisabled) return;
    
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      // Run after render to ensure tooltip is in the DOM
      setTimeout(positionTooltip, 0);
    }, delay);
  };
  
  // Hide tooltip and clear timeout
  const hideTooltip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };
  
  // Update position on scroll or resize
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', positionTooltip);
      window.addEventListener('resize', positionTooltip);
      
      return () => {
        window.removeEventListener('scroll', positionTooltip);
        window.removeEventListener('resize', positionTooltip);
      };
    }
  }, [isVisible]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className="inline-block relative"
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {/* Wrap children to add ARIA attributes if they're not a button or input */}
      <div 
        role="tooltip"
        aria-describedby={isVisible ? "tooltip-content" : undefined}
        tabIndex={0} 
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={`fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded shadow-md pointer-events-none ${className}`}
          style={{
            left: coords.x,
            top: coords.y,
            maxWidth,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 150ms ease-in-out',
          }}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px]' : 
              position === 'right' ? 'left-[-4px]' : 
              position === 'bottom' ? 'top-[-4px]' : 
              'right-[-4px]'
            }`}
            style={{
              [position === 'top' || position === 'bottom' ? 'left' : 'top']: 'calc(50% - 4px)',
            }}
          />
        </div>
      )}
    </div>
  );
}

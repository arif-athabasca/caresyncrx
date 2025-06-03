'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Tabs Component
 * - WCAG AA compliant accessible tabs
 * - Mobile-responsive design
 * - Supports custom styling and disabled state
 */

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/**
 * Accessible Tab component that follows WCAG AA guidelines
 */
export function Tabs({ items, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {items.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition
                ${isActive 
                  ? 'border-primary-600 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Accessible Tab Panel component for use with Tabs component
 */
export interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = '' }: TabPanelProps) {
  const isActive = activeTab === id;
  
  if (!isActive) return null;
  
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

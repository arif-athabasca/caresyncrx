'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Feature Section Component
 * - Responsive feature display for marketing pages
 * - Accessible and mobile-first design
 */

import React from 'react';
import { Card } from './Card';

interface FeatureProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export interface FeatureSectionProps {
  title: string;
  subtitle?: string;
  features: FeatureProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Individual feature item component
 */
export function Feature({ title, description, icon, className = '' }: FeatureProps) {
  return (
    <Card className={className}>
      {icon && (
        <div className="bg-primary-100 rounded-md p-3 inline-flex">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-base text-gray-600">
        {description}
      </p>
    </Card>
  );
}

/**
 * Feature section component for displaying multiple features in a grid
 */
export function FeatureSection({ 
  title, 
  subtitle, 
  features,
  columns = 3,
  className = ''
}: FeatureSectionProps) {
  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'lg:grid-cols-4 md:grid-cols-2'
  };

  return (
    <section className={`py-16 bg-gray-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className={`mt-12 grid gap-8 ${columnClasses[columns]}`}>
          {features.map((feature, index) => (
            <Feature key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

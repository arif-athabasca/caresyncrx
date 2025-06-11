'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Card Components for Triage UI
 * Provides Header, Title, Body, and Footer components for structured card layout
 */

import React from 'react';
import { Card as BaseCard } from '../../../components/ui/Card';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: React.ComponentProps<typeof BaseCard>) {
  return (
    <BaseCard className={className} {...props}>
      {children}
    </BaseCard>
  );
}

Card.Header = function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`border-b border-gray-200 p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-medium text-gray-900 ${className}`}>
      {children}
    </h3>
  );
};

Card.Body = function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`border-t border-gray-200 p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

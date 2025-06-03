'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Hero Section Component
 * - Responsive and accessible hero section for landing pages
 * - Follows WCAG AA guidelines for contrast and accessibility
 * - Mobile-first design with Tailwind CSS
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './Button';

export interface HeroProps {
  title: string;
  subtitle: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  imageUrl?: string;
  imageAlt?: string;
  children?: React.ReactNode;
}

/**
 * Hero section for landing pages with configurable content and CTAs
 */
export function Hero({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = "Hero image",
  children
}: HeroProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="lg:w-1/2 lg:pr-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900" id="hero-title">
              {title}
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              {subtitle}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:space-x-4">
              <Button
                as={Link}
                href={primaryCta.href}
                size="lg"
              >
                {primaryCta.text}
              </Button>
              
              {secondaryCta && (
                <Button
                  as={Link}
                  href={secondaryCta.href}
                  variant="outline"
                  size="lg"
                  className="mt-3 sm:mt-0"
                >
                  {secondaryCta.text}
                </Button>
              )}
            </div>
            
            {children && (
              <div className="mt-6">
                {children}
              </div>
            )}
          </div>
            {imageUrl && (
            <div className="mt-10 lg:mt-0 lg:w-1/2 relative">
              <Image
                src={imageUrl}
                alt={imageAlt}
                width={500}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

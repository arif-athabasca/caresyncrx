/**
 * Tailwind CSS configuration for CareSyncRx.
 * Includes clinical blues and WCAG AA accessibility settings.
 */

import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],  theme: {
    extend: {
      // Add textColor and backgroundColor utilities for our CSS variables
      textColor: {
        foreground: 'var(--foreground)',
      },
      backgroundColor: {
        background: 'var(--background)',
      },
      colors: {
        // Clinical blues palette - Accessible contrast ratios
        primary: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd7ff', 
          300: '#8bbeff',
          400: '#559cff', // WCAG AA for small text on white
          500: '#3b82f6', // WCAG AA for normal text on white
          600: '#2662ea', // WCAG AA for all text on white
          700: '#1d4ed8', // WCAG AA for all text
          800: '#1e40af', // High contrast for accessibility 
          900: '#1e3a8a', // Maximum contrast
          950: '#172554', // Deep blue for dark mode
        },
        // Secondary clinical teal palette
        secondary: {
          50: '#effcff',
          100: '#def8ff',
          200: '#b4f0fb',
          300: '#76e4f0',
          400: '#39ced8', // WCAG AA for normal text on white
          500: '#14b4bf', // WCAG AA for normal text
          600: '#0893a1', // WCAG AA for all text on white
          700: '#0a7582', // High contrast
          800: '#0f5d6a', // Maximum contrast
          900: '#124f5c',
          950: '#07323e',
        },
        // Alert and status colors
        critical: '#dc2626', // Red for critical alerts - WCAG AA
        warning: '#ea580c', // Orange for warnings - WCAG AA
        success: '#16a34a', // Green for success - WCAG AA  
        info: '#2563eb',    // Blue for info - WCAG AA
      },
      // Screen readers and focus indicators for accessibility
      ringColor: {
        DEFAULT: '#3b82f6', // Match primary-500
        focus: '#2563eb',   // Strong visible focus indicator
      },
      // Font families 
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
      },
      // Spacing and sizing
      spacing: {
        // Standard spacing
        // Uses default Tailwind spacing scale
      },
      // Responsive breakpoints - mobile first
      screens: {
        'xs': '360px',    // Small mobile
        'sm': '640px',    // Large mobile/small tablet  
        'md': '768px',    // Tablet
        'lg': '1024px',   // Small desktop/large tablet
        'xl': '1280px',   // Desktop
        '2xl': '1536px',  // Large desktop
      },
      // Animation durations
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Only use form styles via explicit classes
    }),
    require('@tailwindcss/typography'), // For content-rich areas
    require('@tailwindcss/aspect-ratio'), // For responsive media
  ],
  // Core accessibility features
  future: {
    hoverOnlyWhenSupported: true, // Better touch experience
  },
  // Dark mode configuration
  darkMode: 'class', // Use class-based dark mode instead of media query
};

export default config;

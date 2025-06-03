'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Clinical layout component with Tailwind CSS styling
 * - Responsive, mobile-first design
 * - Accessible WCAG AA compliant
 * - Uses clinical blues color palette
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function ClinicalLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Patients', href: '/patients' },
    { name: 'Prescriptions', href: '/prescriptions' },
    { name: 'Reports', href: '/reports' },
    { name: 'Settings', href: '/settings' },
  ];
  
  return (
    <>
      {/* Accessibility skip link */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      
      {/* Header with responsive navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and brand */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="flex items-center no-underline">
                  <span className="text-primary-600 text-lg font-bold">CareSyncRx</span>
                </Link>
              </div>
            </div>
            
            {/* Desktop navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-8" aria-label="Main Navigation">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium no-underline ${
                    pathname === item.href
                      ? 'border-primary-500 text-primary-700 font-semibold'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* User menu */}
            <div className="hidden md:ml-4 md:flex md:items-center">
              <button
                type="button"
                className="bg-white p-1 rounded-full text-gray-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                aria-label="View notifications"
              >
                {/* Notification icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              
              {/* User profile dropdown - can be enhanced with a proper dropdown component */}
              <div className="ml-3 relative">
                <button 
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  aria-label="User menu"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                    Dr
                  </div>
                </button>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                aria-controls="mobile-menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="sr-only">{menuOpen ? 'Close main menu' : 'Open main menu'}</span>
                {!menuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        <div className={`${menuOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium no-underline ${
                  pathname === item.href
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-semibold'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          {/* Mobile profile links */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white">
                  Dr
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">Dr. Jane Smith</div>
                <div className="text-sm font-medium text-gray-500">doctor@caresyncrx.com</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/profile"
                className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 no-underline"
                onClick={() => setMenuOpen(false)}
              >
                Your Profile
              </Link>
              <Link
                href="/settings"
                className="block px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 no-underline"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main id="main-content" className="flex-1 relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      
      {/* Footer with accessibility info */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                &copy; 2025 CareSyncRx. All rights reserved.
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-center md:text-right">
              <div className="flex justify-center md:justify-end space-x-6">
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                  Terms of Service
                </Link>
                <Link href="/accessibility" className="text-sm text-gray-500 hover:text-gray-700">
                  Accessibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

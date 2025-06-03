/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Landing page for CareSyncRx
 */

import Link from 'next/link';
import { Button } from './components/ui/Button';
import { Hero } from './components/ui/Hero';
import { FeatureSection } from './components/ui/FeatureSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">CareSyncRx</h1>
          
          <div className="flex space-x-4">
            <Button
              as={Link}
              href="/login"
              variant="outline"
              size="sm"
            >
              Sign in
            </Button>
            <Button
              as={Link}
              href="/register"
              size="sm"
            >
              Register
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero section */}
      <Hero
        title="Coordinating Care, Empowering Teams"
        subtitle="A PIPEDA-compliant, clinic-based care coordination SaaS platform that empowers multidisciplinary teams (physicians, pharmacists, nurse practitioners) to collaborate on patient care seamlessly."
        primaryCta={{
          text: "Get Started",
          href: "/register"
        }}
        secondaryCta={{
          text: "Learn More",
          href: "/about"
        }}
        imageUrl="/images/hero-image.svg"
        imageAlt="Healthcare professionals using CareSyncRx"
      />
      
      {/* Features section */}
      <FeatureSection
        title="Key Features"
        subtitle="Our platform is designed to improve patient care and streamline healthcare workflows."
        columns={3}
        features={[
          {
            title: "Prescription Management",
            description: "Create, track, and manage prescriptions for your patients with ease.",
            icon: (
              <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          {
            title: "Medication Records",
            description: "Keep comprehensive medication records and history for each patient.",
            icon: (
              <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )
          },
          {
            title: "Secure Platform",
            description: "Advanced security features to protect sensitive patient information.",
            icon: (
              <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )
          }
        ]}
      />
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:order-2 space-x-6">
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-700">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="text-gray-500 hover:text-gray-700">
                Accessibility
              </Link>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center md:text-left text-base text-gray-500">
                &copy; 2025 CareSyncRx. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

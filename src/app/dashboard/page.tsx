'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Dashboard page - main landing for authenticated users
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { UserRole } from '@/enums';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ClinicalLayout from '../components/layout/ClinicalLayout';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [greeting, setGreeting] = useState<string>('');

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    let newGreeting = '';
    
    if (hour < 12) {
      newGreeting = 'Good morning';
    } else if (hour < 18) {
      newGreeting = 'Good afternoon';
    } else {
      newGreeting = 'Good evening';
    }
    
    setGreeting(newGreeting);
  }, []);  // Check if the user is an admin and redirect to admin dashboard
  useEffect(() => {
    if (user && user.role === UserRole.ADMIN) {
      // Redirect admin users to the admin dashboard
      window.location.href = '/admin/dashboard';
    }
  }, [user]);

  // Role-specific dashboard content
  const getDashboardContent = () => {
    if (!user) return null;

    switch (user.role) {
      case UserRole.ADMIN:
        // This is just a fallback in case the redirect doesn't happen
        return (
          <Card
            title="Admin Access"
            subtitle="You have administrative privileges"
            className="bg-warning-50"
            status="warning"
          >
            <p className="mb-4">
              You are currently viewing the regular dashboard, but you have admin privileges.
            </p>
            <Button as="a" href="/admin/dashboard" variant="primary">
              Go to Admin Dashboard
            </Button>
          </Card>
        );
      case UserRole.DOCTOR:
        return (
          <Card
            title="Doctor Dashboard"
            subtitle="View your upcoming patient appointments and manage prescriptions"
            className="bg-primary-50"
            status="info"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card compact>
                <h4 className="font-medium text-gray-900">Upcoming Appointments</h4>
                <p className="text-gray-500 mt-1">You have 5 appointments scheduled today</p>
              </Card>
              <Card compact>
                <h4 className="font-medium text-gray-900">Recent Prescriptions</h4>
                <p className="text-gray-500 mt-1">12 prescriptions issued in the past week</p>
              </Card>
            </div>
          </Card>
        );
        
      case UserRole.PHARMACIST:
        return (
          <Card
            title="Pharmacist Dashboard"
            subtitle="Manage prescription fulfillment and inventory"
            className="bg-green-50"
            status="success"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card compact>
                <h4 className="font-medium text-gray-900">Pending Prescriptions</h4>
                <p className="text-gray-500 mt-1">8 prescriptions waiting for fulfillment</p>
              </Card>
              <Card compact>
                <h4 className="font-medium text-gray-900">Low Stock Alerts</h4>
                <p className="text-gray-500 mt-1">3 medications need to be reordered</p>
              </Card>
            </div>
          </Card>
        );
        
      case UserRole.NURSE:
        return (
          <Card
            title="Nurse Dashboard"
            subtitle="Track patient care and medication administration"
            className="bg-purple-50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card compact>
                <h4 className="font-medium text-gray-900">Patient Monitoring</h4>
                <p className="text-gray-500 mt-1">15 patients currently under your care</p>
              </Card>
              <Card compact>
                <h4 className="font-medium text-gray-900">Medication Schedule</h4>
                <p className="text-gray-500 mt-1">7 medications due in the next hour</p>
              </Card>
            </div>
          </Card>
        );
        
      case UserRole.ADMIN:
        return (
          <Card
            title="Administrator Dashboard"
            subtitle="Manage system users and clinic settings"
            className="bg-amber-50"
            headerAction={
              <Button size="sm" variant="outline">
                View System Status
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card compact>
                <h4 className="font-medium text-gray-900">User Management</h4>
                <p className="text-gray-500 mt-1">42 active users in the system</p>
              </Card>
              <Card compact status="success">
                <h4 className="font-medium text-gray-900">System Metrics</h4>
                <p className="text-gray-500 mt-1">System health: Good</p>
              </Card>
            </div>
          </Card>
        );
        
      default:
        return (
          <Card title="Welcome to CareSyncRx">
            <p>Your personalized dashboard is loading...</p>
          </Card>
        );
    }
  };
  // Handle logout
  const handleLogout = () => {
    logout();
  };
  return (
    <ClinicalLayout>
      <div className="mb-8">        <h2 className="text-3xl font-bold text-gray-900">
          {greeting}, {user?.email?.split('@')[0] || 'User'}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Here&apos;s what&apos;s happening in your healthcare practice today
        </p>
      </div>
      
      {user ? getDashboardContent() : (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">
            Please sign in to access your dashboard
          </p>
        </div>
      )}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Patients Today"
          value="24"
          icon={
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        
        <MetricCard
          label="New Prescriptions"
          value="15"
          icon={
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        />
        
        <MetricCard
          label="Upcoming Appointments"
          value="8"
          icon={
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>
    </ClinicalLayout>
  );
}
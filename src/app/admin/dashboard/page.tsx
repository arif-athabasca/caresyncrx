'use client';

/**
 * Copyright (c) 2025 C   
 * MIT License
 *
 * Admin Dashboard page - Main landing for administrative users
 * Features AI-based triage system and billing management
 */

import { useState, useEffect } from 'react';
import { Card, MetricCard } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Badge } from '@/app/components/ui/Badge';
import { Tabs, TabPanel } from '@/app/components/ui/Tabs';
import ClinicalLayout from '@/app/components/layout/ClinicalLayout';
import { TriageList } from '../triage/components/TriageList';
import { useRouter, useSearchParams } from 'next/navigation';
// Import from the central enums directory
import { UserRole } from '@/enums';
import { withRoleProtection } from '@/auth/components/withRoleProtection';

// Define BadgeVariant type to match the Badge component's accepted values
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'triage');  // Store navigation state for browser history support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AuthSession) {
      window.AuthSession.storeLoginRedirect(window.location.pathname + window.location.search);
    }
  }, []);
  
  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Create new search params and preserve existing ones
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.set('tab', tabId);
    
    // Use Next.js router to update URL
    const newPath = `${window.location.pathname}?${newSearchParams.toString()}`;
    router.push(newPath, { 
      scroll: false // Prevents scrolling to top
    });
    
    // Store the new navigation state
    if (typeof window !== 'undefined' && window.AuthSession) {
      window.AuthSession.storeLoginRedirect(newPath);
    }
  };

  return (
    <ClinicalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage clinic operations, users, and patient assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Active Providers"
          value="28"
          icon={
            <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          change="↑ 3"
          trend="up"
        />
        <MetricCard
          label="Pending Triage"
          value="15"
          icon={
            <svg className="h-6 w-6 text-critical" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          change="↑ 5"
          trend="up"
        />
        <MetricCard
          label="Billing this Month"
          value="$24,350"
          icon={
            <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          change="↑ 8%"
          trend="up"
        />
      </div>

      <div>
        <Tabs
          items={[
            { id: 'triage', label: 'AI Triage' },
            { id: 'billing', label: 'Billing & Insurance' },
            { id: 'users', label: 'User Management' },
            { id: 'reports', label: 'Reports' }
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        <div className="mt-4">
          <TabPanel id="triage" activeTab={activeTab}>
            <TriageTab />
          </TabPanel>
          <TabPanel id="billing" activeTab={activeTab}>
            <BillingTab />
          </TabPanel>
          <TabPanel id="users" activeTab={activeTab}>
            <UsersTab />
          </TabPanel>
          <TabPanel id="reports" activeTab={activeTab}>
            <ReportsTab />
          </TabPanel>
        </div>
      </div>
    </ClinicalLayout>
  );
}

// AI Triage Tab Component
function TriageTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  return (
    <div>
      <TriageList refreshTrigger={refreshTrigger} />
    </div>
  );
}

// Billing Tab Component
function BillingTab() {
  return (
    <div>
      <Card
        title="Billing & Insurance Management"
        subtitle="Track claims, payments, and insurance information"
        headerAction={
          <Button as="a" href="/admin/billing/new" size="sm">
            New Claim
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card compact>
            <h4 className="font-medium text-gray-900">Outstanding Claims</h4>
            <p className="text-2xl font-bold text-critical mt-2">$42,150.00</p>
            <p className="text-sm text-gray-500">32 pending claims</p>
          </Card>
          <Card compact>
            <h4 className="font-medium text-gray-900">Revenue This Month</h4>
            <p className="text-2xl font-bold text-success mt-2">$58,325.00</p>
            <p className="text-sm text-gray-500">↑ 12% from last month</p>
          </Card>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-4">Recent Claims</h4>
        <Table
          columns={[
            { header: 'Patient', accessor: 'patient' },
            { header: 'Service Date', accessor: 'serviceDate' },
            { header: 'Service', accessor: 'service' },
            { header: 'Amount', accessor: 'amount' },
            { 
              header: 'Status',              accessor: (row) => {
                const statusColors: Record<string, BadgeVariant> = {
                  PENDING: 'warning',
                  SUBMITTED: 'info',
                  PAID: 'success',
                  DENIED: 'error',
                  PARTIAL: 'warning'
                };
                return <Badge variant={statusColors[row.status]}>{row.status}</Badge>;
              }
            },
            { 
              header: 'Actions', 
              accessor: (row) => (
                <div className="flex space-x-2">
                  <Button size="xs" variant="outline" as="a" href={`/admin/billing/${row.id}`}>
                    View
                  </Button>
                </div>
              )
            },
          ]}
          data={[
            { 
              id: '1', 
              patient: 'John Smith',
              serviceDate: '2025-05-15',
              service: 'Annual Physical',
              amount: '$250.00',
              status: 'PENDING'
            },
            { 
              id: '2', 
              patient: 'Jane Doe',
              serviceDate: '2025-05-10',
              service: 'Medication Review',
              amount: '$175.00',
              status: 'SUBMITTED'
            },
            { 
              id: '3', 
              patient: 'Mike Johnson',
              serviceDate: '2025-05-01',
              service: 'Lab Tests',
              amount: '$435.00',
              status: 'PAID'
            },
          ]}
          keyField="id"
        />
      </Card>
    </div>
  );
}

// User Management Tab Component
function UsersTab() {
  return (
    <Card
      title="User Management"
      subtitle="Manage healthcare providers and system users"
      headerAction={
        <Button as="a" href="/admin/users/new" size="sm">
          Add User
        </Button>
      }
    >
      <Table
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Email', accessor: 'email' },
          { 
            header: 'Role', 
            accessor: (row) => {
              const roleColors: Record<string, BadgeVariant> = {
                DOCTOR: 'primary',
                NURSE: 'info',
                PHARMACIST: 'success',
                ADMIN: 'warning'
              };
              return <Badge variant={roleColors[row.role]}>{row.role}</Badge>;
            }
          },
          { header: 'Specialty', accessor: 'specialty' },
          { header: 'Status', accessor: row => 
            <Badge variant={row.active ? 'success' : 'neutral'}>
              {row.active ? 'Active' : 'Inactive'}
            </Badge>
          },
          { 
            header: 'Actions', 
            accessor: (row) => (
              <div className="flex space-x-2">
                <Button size="xs" variant="outline" as="a" href={`/admin/users/${row.id}`}>
                  Edit
                </Button>
              </div>
            )
          },
        ]}
        data={[
          { 
            id: '1', 
            name: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@caresyncrx.com',
            role: 'DOCTOR',
            specialty: 'Cardiology',
            active: true
          },
          { 
            id: '2', 
            name: 'Emma Davis, RN',
            email: 'emma.davis@caresyncrx.com',
            role: 'NURSE',
            specialty: 'General',
            active: true
          },
          { 
            id: '3', 
            name: 'Michael Wong, PharmD',
            email: 'michael.wong@caresyncrx.com',
            role: 'PHARMACIST',
            specialty: 'Clinical',
            active: true
          },
        ]}
        keyField="id"
      />
    </Card>
  );
}

// Reports Tab Component
function ReportsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card
        title="Provider Performance"
        subtitle="Patient load and resolution metrics"
      >
        <div className="h-80 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
          [Provider Performance Chart]
        </div>
      </Card>
      
      <Card
        title="Triage Effectiveness"
        subtitle="AI recommendations vs. actual assignments"
      >
        <div className="h-80 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
          [Triage Effectiveness Chart]
        </div>
      </Card>
      
      <Card
        title="Billing Analytics"
        subtitle="Revenue and claim statistics"
      >
        <div className="h-80 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
          [Billing Analytics Chart]
        </div>
      </Card>
      
      <Card
        title="Patient Demographics"
        subtitle="Patient population statistics"
      >
        <div className="h-80 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
          [Patient Demographics Chart]
        </div>
      </Card>
    </div>
  );
}

// Export the component wrapped with role protection
export default withRoleProtection(AdminDashboardPage, {
  allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  redirectTo: '/login'
});

'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Comprehensive Triage List Component with real-time data and AI integration
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';

interface TriageRecord {
  id: string;
  patient: {
    firstName: string;
    lastName: string;
    id: string;
  };
  symptoms: string;
  urgencyLevel: string;
  status: string;
  aiSuggestion?: {
    analysis: string;
    suggestedUrgency: string;
    providers: Array<{
      name: string;
      confidence: number;
      specialty: string;
    }>;
  };
  assignedTo?: {
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TriageListProps {
  refreshTrigger?: number;
}

export function TriageList({ refreshTrigger = 0 }: TriageListProps) {
  const router = useRouter();
  const [triageRecords, setTriageRecords] = useState<TriageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    urgency: '',
    search: ''
  });

  // Internal refresh function
  const handleRefresh = () => {
    setInternalRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    fetchTriageRecords();
  }, [refreshTrigger, internalRefreshTrigger, filters.status, filters.urgency]);

  const fetchTriageRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.urgency) params.append('urgency', filters.urgency);
      params.append('limit', '50');

      const response = await fetch(`/api/admin/triage?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }      });

      if (!response.ok) {
        throw new Error(`Failed to fetch triage records: ${response.status}`);
      }

      const result = await response.json();
      let data = result.data || [];
      
      // Apply client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter((record: TriageRecord) => 
          record.patient.firstName.toLowerCase().includes(searchLower) ||
          record.patient.lastName.toLowerCase().includes(searchLower) ||
          record.patient.id.toLowerCase().includes(searchLower) ||
          record.symptoms.toLowerCase().includes(searchLower)
        );
      }
      
      setTriageRecords(data);
    } catch (error) {
      console.error('Error fetching triage records:', error);
      setError('Failed to load triage records');
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HIGH':
      case 'CRITICAL': return 'error';
      default: return 'info';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'ASSIGNED': return 'info';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const formatAISuggestion = (aiSuggestion: any): string => {
    if (!aiSuggestion || !aiSuggestion.providers || aiSuggestion.providers.length === 0) {
      return 'No AI recommendation';
    }

    const topProvider = aiSuggestion.providers[0];
    return `${topProvider.name} (${topProvider.confidence}%)`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const tableColumns = [
    { 
      header: 'Patient', 
      accessor: (row: TriageRecord) => (
        <div>
          <div className="font-medium">
            {row.patient.firstName} {row.patient.lastName}
          </div>
          <div className="text-xs text-gray-600">ID: {row.patient.id}</div>
        </div>
      )
    },
    { 
      header: 'Symptoms', 
      accessor: (row: TriageRecord) => (
        <div className="max-w-xs">
          <div className="text-sm" title={row.symptoms}>
            {truncateText(row.symptoms, 60)}
          </div>
        </div>
      )
    },
    {
      header: 'Urgency',
      accessor: (row: TriageRecord) => (
        <Badge variant={getUrgencyBadgeVariant(row.urgencyLevel)}>
          {row.urgencyLevel}
        </Badge>
      )
    },
    { 
      header: 'Status', 
      accessor: (row: TriageRecord) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      )
    },
    { 
      header: 'AI Recommendation', 
      accessor: (row: TriageRecord) => (
        <div className="text-sm">
          {formatAISuggestion(row.aiSuggestion)}
        </div>
      )
    },
    {
      header: 'Assigned To',
      accessor: (row: TriageRecord) => (
        row.assignedTo ? (
          <div>
            <div className="text-sm font-medium">
              {row.assignedTo.email.split('@')[0]}
            </div>
            <div className="text-xs text-gray-600">
              {row.assignedTo.role}
            </div>
          </div>
        ) : (
          <span className="text-gray-500 text-sm">Unassigned</span>
        )
      )
    },
    {
      header: 'Created',
      accessor: (row: TriageRecord) => (
        <div className="text-sm text-gray-600">
          {formatDateTime(row.createdAt)}
        </div>
      )
    },
    { 
      header: 'Actions', 
      accessor: (row: TriageRecord) => (
        <div className="flex space-x-2">
          <Button 
            size="xs" 
            variant="primary" 
            onClick={() => router.push(`/admin/triage/${row.id}`)}
          >
            View
          </Button>
          {row.status === 'PENDING' && (
            <Button 
              size="xs" 
              variant="outline" 
              onClick={() => router.push(`/admin/triage/${row.id}/assign`)}
            >
              Assign
            </Button>
          )}
          {row.status === 'ASSIGNED' && (
            <Button 
              size="xs" 
              variant="secondary" 
              onClick={() => router.push(`/admin/schedule?provider=${row.assignedTo?.email}`)}
            >
              Schedule
            </Button>
          )}
        </div>
      )
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-lg">Loading triage records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchTriageRecords} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>      <Card
        title="AI-Powered Triage Queue"
        subtitle="Intelligent patient triage with AI recommendations and provider matching"
        headerAction={
          <div className="flex space-x-2">
            <Button 
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </Button>
            <Button 
              as="a" 
              href="/admin/schedule" 
              size="sm"
              variant="secondary"
            >
              📅 Scheduler
            </Button>
            <Button 
              as="a" 
              href="/admin/triage/new" 
              size="sm"
            >
              ➕ New Triage
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search patients or symptoms..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={filters.urgency}
              onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Urgency Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', count: triageRecords.length, color: 'bg-blue-100 text-blue-800' },
            { label: 'Pending', count: triageRecords.filter(t => t.status === 'PENDING').length, color: 'bg-yellow-100 text-yellow-800' },
            { label: 'Assigned', count: triageRecords.filter(t => t.status === 'ASSIGNED').length, color: 'bg-blue-100 text-blue-800' },
            { label: 'High Priority', count: triageRecords.filter(t => t.urgencyLevel === 'HIGH').length, color: 'bg-red-100 text-red-800' },
            { label: 'With AI Rec.', count: triageRecords.filter(t => t.aiSuggestion && t.aiSuggestion.providers?.length > 0).length, color: 'bg-green-100 text-green-800' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stat.color}`}>
                {stat.count}
              </div>
              <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <Table
          columns={tableColumns}
          data={triageRecords}
          keyField="id"
          emptyState={
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No triage cases found</div>
              <div className="text-gray-400 text-sm mb-4">
                {filters.search || filters.status || filters.urgency 
                  ? 'Try adjusting your filters'
                  : 'Create your first triage case to get started'
                }
              </div>
              <Button 
                as="a" 
                href="/admin/triage/new"
                variant="primary"
              >
                Create New Triage
              </Button>
            </div>
          }
        />
      </Card>    </div>
  );
}

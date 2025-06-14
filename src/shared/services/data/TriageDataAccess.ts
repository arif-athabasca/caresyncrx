/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Triage Data Access Service - High-performance data access for triage operations
 * Implements optimized queries with caching for triage management
 */

import { BaseDataAccess } from './BaseDataAccess';
import { prisma } from '../../../lib/prisma';
import { usersDataAccess } from './UsersDataAccess';
import { randomUUID } from 'crypto';

export interface TriageRecord {
  id: string;
  patientId?: string | null;
  symptoms: string;
  urgencyLevel: string;
  notes?: string | null;
  status: string;
  assignedToId?: string | null;
  assignedBy?: string | null;
  assignmentReason?: string | null;
  aiSuggestion?: any;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  assignedTo?: {
    id: string;
    email: string;
    role: string;
  } | null;
  adminAssignedBy?: {
    id: string;
    email: string;
    role: string;
  } | null;
}

export interface TriageFilters {
  status?: string;
  urgency?: string;
  patientId?: string;
  assignedToId?: string;
  clinicId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface TriageListResponse {
  data: TriageRecord[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
}

export class TriageDataAccess extends BaseDataAccess {
  private readonly cacheConfig = {
    enabled: true,
    ttlSeconds: 60, // 1 minute for triage data (frequently changing)
    keyPrefix: 'triage'
  };

  /**
   * Transform Prisma response to match TriageRecord interface
   */
  private transformTriageRecord(record: any): TriageRecord {
    return {
      ...record,
      patient: record.Patient || null,
      assignedTo: record.User_PatientTriage_assignedToIdToUser || null,
      adminAssignedBy: record.User_PatientTriage_assignedByToUser || null,
      // Remove the original Prisma relation names
      Patient: undefined,
      User_PatientTriage_assignedToIdToUser: undefined,
      User_PatientTriage_assignedByToUser: undefined
    };
  }

  /**
   * Get paginated triage list with filters
   */
  async getTriageList(
    filters: TriageFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<TriageListResponse> {
    const cacheKey = this.buildCacheKey('list', { ...filters, ...pagination });

    return this.executeQuery(
      cacheKey,
      async () => {
        // Build where conditions
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.urgency) where.urgencyLevel = filters.urgency;
        if (filters.patientId) where.patientId = filters.patientId;
        if (filters.assignedToId) where.assignedToId = filters.assignedToId;
        if (filters.clinicId) {
          where.Patient = {
            clinicId: filters.clinicId
          };
        }
        if (filters.dateFrom || filters.dateTo) {
          where.createdAt = {};
          if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
          if (filters.dateTo) where.createdAt.lte = filters.dateTo;
        }

        const skip = (pagination.page - 1) * pagination.limit;

        // Execute queries in parallel
        const [triageRecords, totalCount] = await Promise.all([
          prisma.patientTriage.findMany({
            where,
            take: pagination.limit,
            skip,
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              Patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              },
              User_PatientTriage_assignedToIdToUser: {
                select: {
                  id: true,
                  email: true,
                  role: true
                }
              },
              User_PatientTriage_assignedByToUser: {
                select: {
                  id: true,
                  email: true,
                  role: true
                }
              }
            }
          }),
          prisma.patientTriage.count({ where })
        ]);

        return {
          data: triageRecords.map(record => this.transformTriageRecord(record)),
          pagination: {
            total: totalCount,
            page: pagination.page,
            pageSize: pagination.limit,
            pageCount: Math.ceil(totalCount / pagination.limit)
          }
        };
      },
      { cache: this.cacheConfig }
    );
  }

  /**
   * Get triage by ID
   */
  async getTriageById(triageId: string): Promise<TriageRecord | null> {
    const cacheKey = this.buildCacheKey('detail', { triageId });

    return this.executeQuery(
      cacheKey,
      async () => {
        const result = await prisma.patientTriage.findUnique({
          where: { id: triageId },
          include: {
            Patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            User_PatientTriage_assignedToIdToUser: {
              select: {
                id: true,
                email: true,
                role: true
              }
            },
            User_PatientTriage_assignedByToUser: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });
        
        return result ? this.transformTriageRecord(result) : null;
      },
      { cache: this.cacheConfig }
    );
  }

  /**
   * Create new triage record
   */
  async createTriage(data: {
    patientId: string;
    symptoms: string;
    urgencyLevel: string;
    aiSuggestion?: any;
    createdById: string;
  }): Promise<TriageRecord> {
    const triage = await prisma.patientTriage.create({
      data: {
        id: randomUUID(),
        patientId: data.patientId,
        symptoms: data.symptoms,
        urgencyLevel: data.urgencyLevel as any,
        status: 'PENDING' as any,
        aiSuggestion: data.aiSuggestion || {},
        assignedBy: null,
        assignedToId: null,
        updatedAt: new Date()
      },
      include: {
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        User_PatientTriage_assignedToIdToUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        patientId: data.patientId,
        userId: data.createdById,
        action: 'TRIAGE_CREATED',
        details: {
          triageId: triage.id,
          urgencyLevel: data.urgencyLevel
        }
      }
    });

    // Invalidate related caches
    await this.invalidateTriageCaches();

    return this.transformTriageRecord(triage);
  }

  /**
   * Update triage status
   */
  async updateTriageStatus(
    triageId: string,
    status: string,
    updatedById: string,
    assignedToId?: string,
    assignmentReason?: string
  ): Promise<TriageRecord> {
    // Get existing triage for audit
    const existingTriage = await this.getTriageById(triageId);
    if (!existingTriage) {
      throw new Error('Triage not found');
    }

    // Update triage
    const updatedTriage = await prisma.patientTriage.update({
      where: { id: triageId },
      data: {
        status: status as any,
        assignedToId,
        assignedBy: assignedToId ? updatedById : undefined,
        assignmentReason,
        updatedAt: new Date()
      },
      include: {
        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        User_PatientTriage_assignedToIdToUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        User_PatientTriage_assignedByToUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        patientId: existingTriage.patientId,
        userId: updatedById,
        action: 'TRIAGE_STATUS_UPDATED',
        details: {
          triageId,
          oldStatus: existingTriage.status,
          newStatus: status,
          assignedToId,
          assignmentReason
        }
      }
    });

    // Invalidate caches
    await this.invalidateTriageCaches(triageId);

    // Invalidate provider caches if assignment changed
    if (assignedToId) {
      await usersDataAccess.invalidateProviderCaches(undefined, assignedToId);
    }

    return this.transformTriageRecord(updatedTriage);
  }

  /**
   * Get triage statistics for dashboard
   */
  async getTriageStatistics(clinicId?: string): Promise<{
    total: number;
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const cacheKey = this.buildCacheKey('stats', { clinicId });

    return this.executeQuery(
      cacheKey,
      async () => {
        const baseWhere = clinicId ? {
          Patient: {
            clinicId
          }
        } : {};

        const [
          total,
          pending,
          assigned,
          inProgress,
          completed,
          high,
          medium,
          low
        ] = await Promise.all([
          prisma.patientTriage.count({ where: baseWhere }),
          prisma.patientTriage.count({ where: { ...baseWhere, status: 'PENDING' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, status: 'ASSIGNED' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, urgencyLevel: 'HIGH' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, urgencyLevel: 'MEDIUM' } }),
          prisma.patientTriage.count({ where: { ...baseWhere, urgencyLevel: 'LOW' } })
        ]);

        return {
          total,
          pending,
          assigned,
          inProgress,
          completed,
          high,
          medium,
          low
        };
      },
      { cache: { ...this.cacheConfig, ttlSeconds: 300 } } // 5 minutes for stats
    );
  }

  /**
   * Invalidate triage-related caches
   */
  async invalidateTriageCaches(triageId?: string): Promise<void> {
    if (triageId) {
      // Invalidate specific triage caches
      await this.invalidateCache('triage', [
        this.buildCacheKey('detail', { triageId })
      ]);
    }

    // Invalidate list and stats caches
    await this.invalidateNamespace('triage');
  }
}

export const triageDataAccess = new TriageDataAccess();

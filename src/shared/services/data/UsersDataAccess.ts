/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Users Data Access Service - High-performance data access for user/provider operations
 * Implements optimized queries for provider selection with specialized caching strategies
 */

import { UserRole } from '@/enums';
import { BaseDataAccess } from './BaseDataAccess';
import { prisma } from '../../../lib/prisma';

export interface ProviderInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  clinicId: string;
  specialties: Array<{
    id: string;
    specialty: string;
    expertise: string[];
    procedures: string[];
    urgencyLevel: string[];
    yearsExp?: number | null;
    isCertified: boolean;
    certificationBody?: string | null;
    registrationNum?: string | null;
  }>;
  availability: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    maxPatients: number;
  }>;
  workload: {
    assignedTriages: number;
    availableSlots: number;
    utilizationRate: number;
  };
}

export interface ProviderSearchFilters {
  clinicId: string;
  roles?: UserRole[];
  availableOnly?: boolean;
  maxWorkload?: number;
  hasSpecialty?: string;
}

export class UsersDataAccess extends BaseDataAccess {
  private readonly cacheConfig = {
    enabled: true,
    ttlSeconds: 180, // 3 minutes for provider data
    keyPrefix: 'users'
  };  /**
   * Get providers for dropdown selection with optimized query
   */  async getProvidersForDropdown(clinicId: string, roles: UserRole[] = [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST]): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    specialty: string;
    isAvailable: boolean;
  }>> {
    // Convert roles to strings for database query
    const roleStrings = roles.map(role => role.toString());
    const cacheKey = this.buildCacheKey('providers_dropdown', { clinicId, roles: roleStrings.sort().join(',') });

    return this.executeQuery(
      cacheKey,
      async () => {
        // Optimized query to prevent duplicate providers due to multiple specialties
        const sql = `
          SELECT 
            u.id,
            u."firstName",
            u."lastName",
            u.email,
            u.role::text as role,
            COALESCE(
              (SELECT ps.specialty 
               FROM "ProviderSpecialty" ps 
               WHERE ps."providerId" = u.id AND ps."isCertified" = true 
               ORDER BY ps."createdAt" ASC 
               LIMIT 1), 
              'General Practice'
            ) as specialty,
            true as is_available
          FROM "User" u
          WHERE u."clinicId" = $1 
            AND u.role::text = ANY($2::text[])
          ORDER BY 
            role ASC,
            u."firstName" ASC,
            u."lastName" ASC
        `;

        const result = await prisma.$queryRawUnsafe<Array<{
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          role: string;
          specialty: string;
          is_available: boolean;
        }>>(sql, clinicId, roleStrings);

        return result.map(row => ({
          id: row.id,
          name: `${row.firstName} ${row.lastName}`,
          email: row.email,
          role: row.role as UserRole,
          specialty: row.specialty || 'General Practice',
          isAvailable: row.is_available
        }));
      },
      { cache: this.cacheConfig }
    );
  }
  /**
   * Get detailed provider information for triage suggestions
   */
  async getProvidersForTriage(filters: ProviderSearchFilters): Promise<ProviderInfo[]> {
    const cacheKey = this.buildCacheKey('providers_triage', filters);

    return this.executeQuery(
      cacheKey,      async () => {
        // All provider roles that can handle triage assignments
        const validProviderRoles = [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST];
        const rolesToUse = filters.roles 
          ? filters.roles.filter(role => validProviderRoles.includes(role))
          : [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST];

        const whereConditions: any = {
          clinicId: filters.clinicId,
          role: { in: rolesToUse }
        };        const providers = await prisma.user.findMany({
          where: whereConditions,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            clinicId: true,
            ProviderSpecialty: {
              where: { isCertified: true },
              select: {
                id: true,
                specialty: true,
                expertise: true,
                procedures: true,
                urgencyLevel: true,
                yearsExp: true,
                isCertified: true,
                certificationBody: true,
                registrationNum: true
              }
            },
            ProviderAvailability: {
              select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                isAvailable: true,
                maxPatients: true
              }
            },
            PatientTriage_PatientTriage_assignedToIdToUser: {
              where: {
                status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
              },
              select: { id: true }
            },
            ScheduleSlot: {
              where: {
                startTime: { gte: new Date() },
                status: 'AVAILABLE'
              },
              select: { id: true }
            }
          }
        });        return providers.map(provider => ({
          id: provider.id,
          firstName: provider.firstName,
          lastName: provider.lastName,
          email: provider.email,
          role: provider.role as UserRole,
          clinicId: provider.clinicId,
          specialties: provider.ProviderSpecialty,
          availability: provider.ProviderAvailability,
          workload: {
            assignedTriages: provider.PatientTriage_PatientTriage_assignedToIdToUser.length,
            availableSlots: provider.ScheduleSlot.length,
            utilizationRate: provider.PatientTriage_PatientTriage_assignedToIdToUser.length / (provider.ProviderAvailability.reduce((sum: number, a: any) => sum + a.maxPatients, 0) || 10) * 100
          }
        }));
      },
      { cache: { ...this.cacheConfig, ttlSeconds: 120 } } // Shorter TTL for triage data
    );
  }
  /**
   * Get provider by ID with caching
   */
  async getProviderById(providerId: string): Promise<ProviderInfo | null> {
    const cacheKey = this.buildCacheKey('provider_detail', { providerId });

    return this.executeQuery(
      cacheKey,
      async () => {        const provider = await prisma.user.findUnique({
          where: { id: providerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,            email: true,
            role: true,
            clinicId: true,
            ProviderSpecialty: {
              where: { isCertified: true },
              select: {
                id: true,
                specialty: true,
                expertise: true,
                procedures: true,
                urgencyLevel: true,
                yearsExp: true,
                isCertified: true,
                certificationBody: true,
                registrationNum: true              }
            },
            ProviderAvailability: {
              select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                isAvailable: true,
                maxPatients: true              }
            },
            PatientTriage_PatientTriage_assignedToIdToUser: {
              where: {
                status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
              },
              select: { id: true }
            },            ScheduleSlot: {
              where: {
                startTime: { gte: new Date() },
                status: 'AVAILABLE'
              },
              select: { id: true }
            }
          }
        });

        if (!provider) return null;

        return {
          id: provider.id,
          firstName: provider.firstName,
          lastName: provider.lastName,
          email: provider.email,          role: provider.role as UserRole,
          clinicId: provider.clinicId,
          specialties: provider.ProviderSpecialty,
          availability: provider.ProviderAvailability,
          workload: {
            assignedTriages: provider.PatientTriage_PatientTriage_assignedToIdToUser.length,
            availableSlots: provider.ScheduleSlot.length,
            utilizationRate: provider.PatientTriage_PatientTriage_assignedToIdToUser.length / (provider.ProviderAvailability.reduce((sum: number, a: any) => sum + a.maxPatients, 0) || 10) * 100
          }
        };
      },
      { cache: this.cacheConfig }
    );
  }

  /**
   * Invalidate provider-related caches
   */
  async invalidateProviderCaches(clinicId?: string, providerId?: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    if (clinicId) {
      // Invalidate clinic-specific caches
      keysToInvalidate.push(
        this.buildCacheKey('providers_dropdown', { clinicId }),
        this.buildCacheKey('providers_triage', { clinicId })
      );
    }

    if (providerId) {
      // Invalidate provider-specific caches
      keysToInvalidate.push(
        this.buildCacheKey('provider_detail', { providerId })
      );
    }

    if (keysToInvalidate.length === 0) {
      // Invalidate all user caches
      await this.invalidateNamespace('users');
    } else {
      await this.invalidateCache('users', keysToInvalidate);
    }
  }
  /**
   * Warm up caches for a clinic
   */
  async warmProviderCaches(clinicId: string): Promise<void> {
    try {
      // Warm up dropdown cache
      await this.getProvidersForDropdown(clinicId);
      
      // Warm up triage providers cache
      await this.getProvidersForTriage({ clinicId });
      
      console.log(`🔥 Warmed provider caches for clinic: ${clinicId}`);
    } catch (error) {
      console.warn('Failed to warm provider caches:', error);
    }
  }
}

export const usersDataAccess = new UsersDataAccess();

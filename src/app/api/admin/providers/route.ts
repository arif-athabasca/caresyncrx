/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for fetching provider information
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/enums';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching providers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle missing clinicId (for existing tokens that don't have it)
    if (!session.user.clinicId) {
      return NextResponse.json({ 
        error: 'Session expired. Please log out and log back in to continue.',
        code: 'CLINIC_ID_MISSING'
      }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const rolesParam = searchParams.getAll('roles');
    const clinicId = searchParams.get('clinicId') || session.user.clinicId;
    
    // Default to healthcare provider roles
    const defaultRoles = [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST];
    const roles = rolesParam.length > 0 ? rolesParam : defaultRoles;
    
    // Build where clause
    const whereClause: any = {
      role: { in: roles },
      clinicId: clinicId
    };
    
    // Fetch providers
    const providers = await prisma.user.findMany({
      where: whereClause,
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
            specialty: true
          }
        },
        ProviderAvailability: {
          select: {
            dayOfWeek: true,
            isAvailable: true
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });
    
    // Transform data for ProviderSelect component
    const transformedProviders = providers.map(provider => {
      // Get primary specialty
      const specialty = provider.ProviderSpecialty.length > 0 
        ? provider.ProviderSpecialty[0].specialty 
        : undefined;
      
      // Check if available today
      const today = new Date().getDay();
      const isAvailable = provider.ProviderAvailability.some(
        avail => avail.dayOfWeek === today && avail.isAvailable
      );
      
      return {
        id: provider.id,
        firstName: provider.firstName,
        lastName: provider.lastName,
        email: provider.email,
        role: provider.role,
        specialty: specialty,
        isAvailable: isAvailable,
        clinicId: provider.clinicId
      };
    });
    
    return NextResponse.json({ 
      providers: transformedProviders,
      total: transformedProviders.length 
    });
    
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
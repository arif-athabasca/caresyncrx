/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for managing provider availability schedules
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * GET handler for fetching provider availability data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');

    // Build where conditions
    const whereConditions: any = {
      role: { in: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST] },
      clinicId: session.user.clinicId
    };

    if (providerId) {
      whereConditions.id = providerId;
    }

    // Fetch providers with their availability and current workload
    const providers = await prisma.user.findMany({
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
            specialty: true,
            expertise: true
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
          },
          orderBy: {
            dayOfWeek: 'asc'
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
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    // Transform data to include calculated availability status
    const providersWithStatus = providers.map(provider => {
      const currentWorkload = provider.PatientTriage_PatientTriage_assignedToIdToUser.length;
      const availableSlots = provider.ScheduleSlot.length;
      
      // Calculate availability status
      let availabilityStatus = 'unavailable';
      const today = new Date().getDay();
      const todayAvailability = provider.ProviderAvailability.find(a => a.dayOfWeek === today);
      
      if (todayAvailability && todayAvailability.isAvailable) {
        if (currentWorkload === 0) {
          availabilityStatus = 'available';
        } else if (currentWorkload < (todayAvailability.maxPatients || 8)) {
          availabilityStatus = 'busy';
        } else {
          availabilityStatus = 'unavailable';
        }
      }

      // Calculate next available time
      let nextAvailable = null;
      const now = new Date();
      
      // Find next available day
      for (let i = 0; i < 7; i++) {
        const checkDay = (now.getDay() + i) % 7;
        const dayAvailability = provider.ProviderAvailability.find(a => a.dayOfWeek === checkDay);
        
        if (dayAvailability && dayAvailability.isAvailable) {
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + i);
          const [hours, minutes] = dayAvailability.startTime.split(':');
          nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          if (nextDate > now) {
            nextAvailable = nextDate.toLocaleString();
            break;
          }
        }
      }

      return {
        id: provider.id,
        firstName: provider.firstName,
        lastName: provider.lastName,
        email: provider.email,
        role: provider.role,
        specialties: provider.ProviderSpecialty,
        availability: provider.ProviderAvailability,
        currentWorkload,
        availableSlots,
        availabilityStatus,
        nextAvailable
      };
    });

    return NextResponse.json({ 
      data: providersWithStatus,
      total: providersWithStatus.length 
    });

  } catch (error) {
    console.error('Error fetching provider availability:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler for updating provider availability schedules
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { providerId, availability } = body;

    // Validate required fields
    if (!providerId || !Array.isArray(availability)) {
      return NextResponse.json({ 
        error: 'Provider ID and availability array are required' 
      }, { status: 400 });
    }

    // Verify provider exists and belongs to the same clinic
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { 
        id: true, 
        clinicId: true, 
        email: true, 
        role: true 
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Provider not in your clinic' }, { status: 403 });
    }

    // Validate availability data
    for (const slot of availability) {
      if (typeof slot.dayOfWeek !== 'number' || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        return NextResponse.json({ 
          error: 'Invalid day of week. Must be 0-6 (Sunday-Saturday)' 
        }, { status: 400 });
      }

      if (slot.isAvailable) {
        if (!slot.startTime || !slot.endTime) {
          return NextResponse.json({ 
            error: 'Start time and end time are required for available days' 
          }, { status: 400 });
        }

        if (!slot.maxPatients || slot.maxPatients < 1) {
          return NextResponse.json({ 
            error: 'Max patients must be at least 1 for available days' 
          }, { status: 400 });
        }
      }
    }

    // Delete existing availability for this provider
    await prisma.providerAvailability.deleteMany({
      where: { providerId }
    });

    // Create new availability records
    const newAvailability = await Promise.all(
      availability.map(async (slot: any) => {
        return prisma.providerAvailability.create({
          data: {
            id: randomUUID(),
            providerId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.isAvailable ? slot.startTime : '09:00',
            endTime: slot.isAvailable ? slot.endTime : '17:00',
            isAvailable: slot.isAvailable,
            maxPatients: slot.isAvailable ? slot.maxPatients : 0,
            updatedAt: new Date()
          }
        });
      })
    );

    // Log the update
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'PROVIDER_AVAILABILITY_UPDATED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Provider availability schedule updated',
        metadata: JSON.stringify({
          providerId,
          providerEmail: provider.email,
          availabilitySlots: availability.length,
          availableDays: availability.filter((slot: any) => slot.isAvailable).length
        })
      }
    });

    return NextResponse.json({ 
      data: newAvailability,
      message: 'Provider availability updated successfully' 
    });

  } catch (error) {
    console.error('Error updating provider availability:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH handler for updating individual availability slots
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availabilityId, ...updates } = body;

    if (!availabilityId) {
      return NextResponse.json({ 
        error: 'Availability ID is required' 
      }, { status: 400 });
    }

    // Verify availability record exists and provider belongs to clinic
    const existingAvailability = await prisma.providerAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        provider: {
          select: {
            id: true,
            clinicId: true,
            email: true
          }
        }
      }
    });

    if (!existingAvailability) {
      return NextResponse.json({ error: 'Availability record not found' }, { status: 404 });
    }

    if (existingAvailability.provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Availability record not found' }, { status: 404 });
    }

    // Update the availability record
    const updatedAvailability = await prisma.providerAvailability.update({
      where: { id: availabilityId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    // Log the update
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'PROVIDER_AVAILABILITY_SLOT_UPDATED',
        severity: 'INFO',
        userId: session.user.id,
        username: session.user.email,
        description: 'Provider availability slot updated',
        metadata: JSON.stringify({
          availabilityId,
          providerId: existingAvailability.providerId,
          dayOfWeek: existingAvailability.dayOfWeek,
          changes: updates
        })
      }
    });

    return NextResponse.json({ 
      data: updatedAvailability,
      message: 'Availability slot updated successfully' 
    });

  } catch (error) {
    console.error('Error updating availability slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
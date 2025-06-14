/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for provider availability and scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for checking provider availability
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');
    const date = searchParams.get('date');
    const specialty = searchParams.get('specialty');
    
    // Base query for providers in the same clinic
    const whereClause: any = {
      role: { in: [UserRole.DOCTOR, UserRole.NURSE, UserRole.PHARMACIST] },
      clinicId: session.user.clinicId
    };
    
    // Filter by specific provider if requested
    if (providerId) {
      whereClause.id = providerId;
    }
    
    const providers = await prisma.user.findMany({
      where: whereClause,
      include: {
        specialties: specialty ? {
          where: { specialty: { contains: specialty, mode: 'insensitive' } }
        } : true,
        availability: true,
        assignedTriages: {
          where: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        }
      }
    });
    
    // Calculate availability for each provider
    const availabilityData = providers.map(provider => {
      const currentWorkload = provider.assignedTriages.length;
      
      // Get today's availability
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const todayAvailability = provider.availability.find(
        avail => avail.dayOfWeek === dayOfWeek && avail.isAvailable
      );
      
      let availabilityStatus = 'unavailable';
      let nextAvailable = null;
      let maxCapacity = 0;
      
      if (todayAvailability) {
        maxCapacity = todayAvailability.maxPatients;
        
        if (currentWorkload < maxCapacity) {
          availabilityStatus = 'available';
          
          // Calculate next available slot (simplified)
          const now = new Date();
          const [startHour, startMinute] = todayAvailability.startTime.split(':').map(Number);
          const [endHour, endMinute] = todayAvailability.endTime.split(':').map(Number);
          
          const startTime = new Date(now);
          startTime.setHours(startHour, startMinute, 0, 0);
          
          const endTime = new Date(now);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          if (now >= startTime && now <= endTime) {
            // Available now
            nextAvailable = now.toISOString();
          } else if (now < startTime) {
            // Available later today
            nextAvailable = startTime.toISOString();
          } else {
            // Available tomorrow
            const tomorrow = new Date(startTime);
            tomorrow.setDate(tomorrow.getDate() + 1);
            nextAvailable = tomorrow.toISOString();
          }
        } else {
          availabilityStatus = 'busy';
        }
      }
      
      return {
        id: provider.id,
        name: provider.email.split('@')[0].replace('.', ' '),
        role: provider.role,
        specialties: provider.specialties.map(s => s.specialty),
        currentWorkload,
        maxCapacity,
        availabilityStatus,
        nextAvailable,
        workloadPercentage: maxCapacity > 0 ? Math.round((currentWorkload / maxCapacity) * 100) : 100
      };
    });
    
    return NextResponse.json({ data: availabilityData });
    
  } catch (error) {
    console.error('Error fetching provider availability:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler for updating provider availability
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Only allow providers to update their own availability or admins to update any
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { providerId, dayOfWeek, startTime, endTime, maxPatients, isAvailable } = body;
    
    // Check permissions
    if (session.user.role !== UserRole.ADMIN && session.user.id !== providerId) {
      return NextResponse.json({ error: 'Can only update own availability' }, { status: 403 });
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 });
    }
    
    // Update or create availability record
    const availability = await prisma.providerAvailability.upsert({
      where: {
        providerId_dayOfWeek_startTime_endTime: {
          providerId,
          dayOfWeek,
          startTime,
          endTime
        }
      },
      update: {
        maxPatients,
        isAvailable,
        updatedAt: new Date()
      },
      create: {
        providerId,
        dayOfWeek,
        startTime,
        endTime,
        maxPatients,
        isAvailable
      }
    });
    
    return NextResponse.json({ 
      data: availability,
      message: 'Availability updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating provider availability:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

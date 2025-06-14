/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for creating and retrieving patient triage requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';
import { triageDataAccess } from '@/shared/services/data/TriageDataAccess';

/**
 * GET handler for listing triage requests with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
      // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    
    // Use data access layer for optimized query with caching
    const result = await triageDataAccess.getTriageList(
      {
        status: status || undefined,
        urgency: urgency || undefined,
        patientId: patientId || undefined,
        clinicId: session.user.clinicId
      },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching triage requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST handler for creating a new triage request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
      // Parse request body
    const body = await request.json();
    const { patientId, symptoms, urgencyLevel, aiSuggestion, assignedToId, assignmentReason } = body;
    
    // Validate required fields
    if (!patientId || !symptoms || !urgencyLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Use data access layer for optimized creation with caching
    const triage = await triageDataAccess.createTriage({
      patientId,
      symptoms,
      urgencyLevel,
      aiSuggestion,
      createdById: session.user.id
    });

    // If provider is assigned, update the triage
    if (assignedToId) {
      const updatedTriage = await triageDataAccess.updateTriageStatus(
        triage.id,
        'ASSIGNED',
        session.user.id,
        assignedToId,
        assignmentReason
      );
      return NextResponse.json({ data: updatedTriage });
    }

    return NextResponse.json({ data: triage });
  } catch (error) {
    console.error('Error creating triage request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH handler for updating triage status
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get triage ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const triageId = pathParts[pathParts.length - 1];

    if (!triageId) {
      return NextResponse.json({ error: 'Triage ID required' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if triage exists
    const existingTriage = await prisma.patientTriage.findUnique({
      where: { id: triageId }
    });

    if (!existingTriage) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 });
    }

    // Update triage status
    const updatedTriage = await prisma.patientTriage.update({
      where: { id: triageId },
      data: {
        status,
        updatedAt: new Date()
      },      include: {
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
            email: true
          }
        }
      }
    });

    // Log audit entry
    await prisma.auditLog.create({      data: {
        id: randomUUID(),
        patientId: existingTriage.patientId,
        userId: session.user.id,
        action: 'TRIAGE_STATUS_UPDATED',
        details: {
          triageId,
          oldStatus: existingTriage.status,
          newStatus: status
        }
      }
    });

    return NextResponse.json({ data: updatedTriage });
  } catch (error) {
    console.error('Error updating triage status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

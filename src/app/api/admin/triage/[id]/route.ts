/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for individual triage operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';

/**
 * PATCH handler for updating individual triage records
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
      // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triageId = params.id;

    // Parse request body
    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if triage exists
    const existingTriage = await prisma.patientTriage.findUnique({
      where: { id: triageId },      include: {
        Patient: true,
        User_PatientTriage_assignedToIdToUser: true
      }
    });

    if (!existingTriage) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status;
    }

    if (notes) {
      updateData.notes = notes;
    }

    // Update triage
    const updatedTriage = await prisma.patientTriage.update({
      where: { id: triageId },
      data: updateData,      include: {
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
        },
        User_PatientTriage_assignedByToUser: {
          select: {
            id: true,
            email: true
          }
        },
        CareAction: true
      }    });

    // Log audit entry
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        patientId: existingTriage.patientId,
        userId: session.user.id,
        action: 'TRIAGE_UPDATED',
        details: {
          triageId,
          changes: { status, notes },
          oldStatus: existingTriage.status
        }
      }
    });

    return NextResponse.json({ data: updatedTriage });
  } catch (error) {
    console.error('Error updating triage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET handler for fetching individual triage details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triageId = params.id;

    // Fetch triage with full details
    const triage = await prisma.patientTriage.findUnique({
      where: { id: triageId },
      include: {        Patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true
          }
        },        User_PatientTriage_assignedToIdToUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        User_PatientTriage_assignedByToUser: {
          select: {
            id: true,
            email: true
          }
        },
        CareAction: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!triage) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 });
    }

    // Check if user has permission to view this triage
    const canView = 
      session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.SUPER_ADMIN ||
      (triage.assignedToId && triage.assignedToId === session.user.id);

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: triage });
  } catch (error) {
    console.error('Error fetching triage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

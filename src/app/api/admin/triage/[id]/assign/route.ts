/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for assigning providers to triage cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';
import { randomUUID } from 'crypto';
import { AuditLogger } from '@/shared/services/audit-logger';

/**
 * POST handler for assigning a provider to a triage case
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const triageId = params.id;
    const body = await request.json();
    const { providerId, assignmentReason, scheduledDateTime } = body;
    
    // Validate required fields
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }    
    // Check if triage exists and is in PENDING status
    const triage = await prisma.patientTriage.findUnique({
      where: { id: triageId },
      include: { Patient: true }
    });
    
    if (!triage) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 });
    }
    
    if (triage.status !== 'PENDING') {
      return NextResponse.json({ error: 'Triage has already been assigned' }, { status: 400 });
    }
    
    // Check if provider exists and belongs to the same clinic
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: { ProviderSpecialty: true, ProviderAvailability: true }
    });
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    
    if (provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: 'Provider not in your clinic' }, { status: 403 });
    }
    
    // Update triage with assignment
    const updatedTriage = await prisma.patientTriage.update({
      where: { id: triageId },
      data: {
        assignedToId: providerId,
        assignedBy: session.user.id,
        assignmentReason: assignmentReason || 'Manually assigned by admin',
        status: 'ASSIGNED',
        updatedAt: new Date()
      },      include: {
        Patient: true,
        User_PatientTriage_assignedToIdToUser: true,
        User_PatientTriage_assignedByToUser: true
      }
    });
    
    // Create care action if scheduled time is provided
    if (scheduledDateTime) {      await prisma.careAction.create({        data: {
          id: randomUUID(),
          triageId,
          actionType: 'INITIAL_CONSULTATION',
          description: `Initial consultation scheduled with ${provider.email}`,
          dueDate: new Date(scheduledDateTime),
          status: 'PENDING',
          updatedAt: new Date()
        }
      });
    }
    
    // Log the assignment
    await AuditLogger.log({
      userId: session.user.id,
      action: 'TRIAGE_ASSIGNED',
      details: {
        triageId,
        patientId: triage.patientId,
        providerId,
        providerRole: provider.role,
        assignmentReason,
        scheduledDateTime,
        resourceType: 'TRIAGE'
      }
    });
    
    return NextResponse.json({ 
      data: updatedTriage,
      message: 'Triage successfully assigned'
    });
    
  } catch (error) {
    console.error('Error assigning triage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET handler for getting assignment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const triageId = params.id;
    
    const triage = await prisma.patientTriage.findUnique({
      where: { id: triageId },      include: {
        Patient: true,        User_PatientTriage_assignedToIdToUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        User_PatientTriage_assignedByToUser: true,
        CareAction: true
      }
    });
    
    if (!triage) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data: triage });
    
  } catch (error) {
    console.error('Error fetching triage assignment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

/**
 * GET handler for listing triage requests with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Build filter criteria
    const where: any = {};
    if (status) where.status = status;
    if (urgency) where.urgencyLevel = urgency;
    if (patientId) where.patientId = patientId;
    
    // Fetch triage requests with related patient and assigned provider
    const triageRequests = await prisma.patientTriage.findMany({
      where,
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    
    // Get total count for pagination
    const totalCount = await prisma.patientTriage.count({ where });
    
    return NextResponse.json({
      data: triageRequests,
      pagination: {
        total: totalCount,
        page,
        pageSize: limit,
        pageCount: Math.ceil(totalCount / limit)
      }
    });
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
    
    // Check if user is authenticated and has admin role
    if (!session || !session.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { patientId, symptoms, urgencyLevel, aiSuggestion } = body;
    
    // Validate required fields
    if (!patientId || !symptoms || !urgencyLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create triage record
    const triage = await prisma.patientTriage.create({
      data: {
        patientId,
        symptoms,
        urgencyLevel,
        status: 'PENDING',
        aiSuggestion: aiSuggestion || {},
        assignedBy: null,
        assignedToId: null
      }
    });
    
    // Log audit entry
    await prisma.auditLog.create({
      data: {
        patientId,
        userId: session.user.id,
        action: 'TRIAGE_CREATED',
        details: {
          triageId: triage.id,
          urgencyLevel
        }
      }
    });
    
    return NextResponse.json({ data: triage });
  } catch (error) {
    console.error('Error creating triage request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

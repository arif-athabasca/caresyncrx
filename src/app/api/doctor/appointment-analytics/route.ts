/**
 * Appointment Analytics AI API - Store and retrieve AI-generated appointment insights
 * Integrates with AppointmentAI table for PIPEDA-compliant storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/services/utils/session-utils';
import { UserRole } from '@/auth';
import { usersDataAccess } from '@/shared/services/data/UsersDataAccess';
import { AuditLogger } from '@/shared/services/audit-logger';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const storeAnalyticsSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month']),
  startDate: z.string(),
  insights: z.array(z.object({
    description: z.string(),
    confidence: z.number().min(0).max(1),
    category: z.string().optional()
  })),
  recommendations: z.array(z.object({
    suggestion: z.string(),
    impact: z.string().optional(),
    priority: z.string().optional()
  })),
  metrics: z.object({
    utilizationRate: z.number().optional(),
    averageDuration: z.number().optional(),
    noShowRate: z.number().optional(),
    efficiency: z.number().optional()
  }),
  optimizations: z.array(z.object({
    description: z.string(),
    expectedBenefit: z.string().optional(),
    implementationEffort: z.string().optional()
  })),
  metadata: z.object({
    aiModel: z.string(),
    timestamp: z.string(),
    appointmentCount: z.number()
  })
});

/**
 * POST - Store Appointment Analytics AI results
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated and has appropriate role
    if (!session || !session.user || 
        ![UserRole.DOCTOR].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle missing clinicId (for existing tokens that don't have it)
    if (!session.user.clinicId) {
      return NextResponse.json({ 
        error: 'Session expired. Please log out and log back in to continue.',
        code: 'CLINIC_ID_MISSING'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storeAnalyticsSchema.parse(body);

    // Store the appointment analytics result
    const analyticsResult = await prisma.appointmentAI.create({
      data: {
        doctorId: session.user.id,
        timeframe: validatedData.timeframe,
        analysisDate: new Date(validatedData.startDate),
        insights: validatedData.insights,
        recommendations: validatedData.recommendations,
        metrics: validatedData.metrics,
        optimizations: validatedData.optimizations,
        aiModel: validatedData.metadata.aiModel,
        metadata: validatedData.metadata,
        appointmentCount: validatedData.metadata.appointmentCount,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log the AI data processing for PIPEDA compliance
    await prisma.aIDataProcessingLog.create({
      data: {
        userId: session.user.id,
        aiServiceUsed: 'appointment-analytics',
        dataProcessed: 'appointment_scheduling_data',
        purpose: 'schedule_optimization_and_analytics',
        consentObtained: true, // Doctor consent implied for their own data
        dataRetentionPeriod: 365, // 1 year retention
        processingTimestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: analyticsResult.id,
        insights: analyticsResult.insights,
        recommendations: analyticsResult.recommendations,
        metrics: analyticsResult.metrics,
        optimizations: analyticsResult.optimizations,
        timeframe: analyticsResult.timeframe,
        analysisDate: analyticsResult.analysisDate
      }
    });

  } catch (error) {
    console.error('Appointment analytics storage error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to store appointment analytics result'
    }, { status: 500 });
  }
}

/**
 * GET - Retrieve appointment analytics results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get analytics results
    const analyticsResults = await prisma.appointmentAI.findMany({
      where: {
        doctorId: session.user.id,
        ...(timeframe && { timeframe })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        analyticsResults: analyticsResults.map(result => ({
          id: result.id,
          timeframe: result.timeframe,
          analysisDate: result.analysisDate,
          insights: result.insights,
          recommendations: result.recommendations,
          metrics: result.metrics,
          optimizations: result.optimizations,
          appointmentCount: result.appointmentCount,
          createdAt: result.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Appointment analytics retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve appointment analytics results'
    }, { status: 500 });
  }
}

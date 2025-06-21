/**
 * Admin Patients API - Paginated Patient Management
 * Get all patients for admin dashboard with pagination, search, and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Query parameters schema for pagination and filtering
const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  clinicId: z.string().optional(),
  verified: z.string().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt', 'healthCardNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search') || undefined,
      clinicId: searchParams.get('clinicId') || undefined,
      verified: searchParams.get('verified') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit)); // Max 100 records per page
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (query.clinicId) {
      where.clinicId = query.clinicId;
    }

    if (query.verified === 'true') {
      where.governmentVerified = true;
    } else if (query.verified === 'false') {
      where.governmentVerified = false;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { healthCardNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.patient.count({ where });

    // Get patients with pagination
    const patients = await prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        healthCardNumber: true,
        healthCardProvince: true,
        healthCardExpiry: true,
        governmentVerified: true,
        lastGovSync: true,
        address: true,
        emergencyContact: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        clinicId: true,
        Clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        PatientInsurance: {
          select: {
            id: true,
            insuranceProvider: true,
            policyNumber: true,
          },
        },
        consent: {
          select: {
            id: true,
            dataProcessingConsent: true,
            marketingConsent: true,
            researchConsent: true,
            consentDate: true,
          },
        },
        _count: {
          select: {
            ScheduleSlot: true,
            Prescription: true,
            ClinicalNote: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // This will be handled by the register endpoint
    return NextResponse.json(
      { error: 'Use /api/admin/patients/register for patient registration' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

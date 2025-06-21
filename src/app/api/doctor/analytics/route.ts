/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * API endpoint for doctor analytics and performance insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserRole } from '@/auth';
import { getSession } from '@/auth/services/utils/session-utils';

/**
 * GET handler for fetching doctor analytics and insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user || session.user.role !== UserRole.DOCTOR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'month'; // day, week, month, quarter, year
    const metricType = searchParams.get('metric') || 'overview'; // overview, patients, appointments, prescriptions, performance

    // Calculate date ranges
    const dateRanges = calculateDateRanges(timeframe);
    const { currentPeriod, previousPeriod, periodLabel } = dateRanges;

    let analyticsData: any = {};

    switch (metricType) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(session.user.id, currentPeriod, previousPeriod);
        break;
      case 'patients':
        analyticsData = await getPatientAnalytics(session.user.id, currentPeriod, previousPeriod);
        break;
      case 'appointments':
        analyticsData = await getAppointmentAnalytics(session.user.id, currentPeriod, previousPeriod);
        break;
      case 'prescriptions':
        analyticsData = await getPrescriptionAnalytics(session.user.id, currentPeriod, previousPeriod);
        break;
      case 'performance':
        analyticsData = await getPerformanceAnalytics(session.user.id, currentPeriod, previousPeriod);
        break;
      default:
        analyticsData = await getOverviewAnalytics(session.user.id, currentPeriod, previousPeriod);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analyticsData,
        metadata: {
          timeframe,
          metricType,
          periodLabel,
          currentPeriod: {
            start: currentPeriod.start,
            end: currentPeriod.end
          },
          previousPeriod: {
            start: previousPeriod.start,
            end: previousPeriod.end
          },
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching doctor analytics:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

/**
 * Calculate date ranges for analytics
 */
function calculateDateRanges(timeframe: string) {
  const now = new Date();
  let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date, label: string;

  switch (timeframe) {
    case 'day':
      currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(now);
      currentEnd.setHours(23, 59, 59, 999);
      
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 1);
      
      label = 'Today vs Yesterday';
      break;

    case 'week':
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - now.getDay());
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6);
      currentEnd.setHours(23, 59, 59, 999);
      
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 7);
      
      label = 'This Week vs Last Week';
      break;

    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), quarter * 3, 1);
      currentEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 3);
      previousEnd = new Date(currentEnd);
      previousEnd.setMonth(previousEnd.getMonth() - 3);
      
      label = 'This Quarter vs Last Quarter';
      break;

    case 'year':
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      
      label = 'This Year vs Last Year';
      break;

    default: // month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      previousEnd = new Date(currentEnd);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
      
      label = 'This Month vs Last Month';
  }

  return {
    currentPeriod: { start: currentStart, end: currentEnd },
    previousPeriod: { start: previousStart, end: previousEnd },
    periodLabel: label
  };
}

/**
 * Get overview analytics
 */
async function getOverviewAnalytics(doctorId: string, currentPeriod: any, previousPeriod: any) {
  const [
    currentStats,
    previousStats,
    totalPatients,
    totalPrescriptions,
    recentActivity
  ] = await Promise.all([
    getBasicStats(doctorId, currentPeriod.start, currentPeriod.end),
    getBasicStats(doctorId, previousPeriod.start, previousPeriod.end),
    getTotalPatients(doctorId),
    getTotalPrescriptions(doctorId),
    getRecentActivity(doctorId)
  ]);

  // Calculate growth percentages
  const growth = calculateGrowth(currentStats, previousStats);

  return {
    overview: {
      currentPeriod: currentStats,
      previousPeriod: previousStats,
      growth,
      totals: {
        totalPatients,
        totalPrescriptions,
        careerAppointments: currentStats.appointments + previousStats.appointments,
        activePrescriptions: currentStats.activePrescriptions
      },
      recentActivity
    }
  };
}

/**
 * Get patient analytics
 */
async function getPatientAnalytics(doctorId: string, currentPeriod: any, previousPeriod: any) {
  const [
    patientStats,
    patientDemographics,
    patientConditions,
    patientOutcomes
  ] = await Promise.all([
    getPatientStats(doctorId, currentPeriod.start, currentPeriod.end),
    getPatientDemographics(doctorId),
    getPatientConditions(doctorId, currentPeriod.start, currentPeriod.end),
    getPatientOutcomes(doctorId, currentPeriod.start, currentPeriod.end)
  ]);

  return {
    patients: {
      stats: patientStats,
      demographics: patientDemographics,
      conditions: patientConditions,
      outcomes: patientOutcomes
    }
  };
}

/**
 * Get appointment analytics
 */
async function getAppointmentAnalytics(doctorId: string, currentPeriod: any, previousPeriod: any) {
  const [
    appointmentStats,
    appointmentTrends,
    appointmentTypes,
    timeDistribution,
    noShowRate
  ] = await Promise.all([
    getAppointmentStats(doctorId, currentPeriod.start, currentPeriod.end),
    getAppointmentTrends(doctorId, currentPeriod.start, currentPeriod.end),
    getAppointmentTypes(doctorId, currentPeriod.start, currentPeriod.end),
    getTimeDistribution(doctorId, currentPeriod.start, currentPeriod.end),
    getNoShowRate(doctorId, currentPeriod.start, currentPeriod.end)
  ]);

  return {
    appointments: {
      stats: appointmentStats,
      trends: appointmentTrends,
      types: appointmentTypes,
      timeDistribution,
      noShowRate
    }
  };
}

/**
 * Get prescription analytics
 */
async function getPrescriptionAnalytics(doctorId: string, currentPeriod: any, previousPeriod: any) {
  const [
    prescriptionStats,
    medicationClasses,
    adherenceRates,
    interactions
  ] = await Promise.all([
    getPrescriptionStats(doctorId, currentPeriod.start, currentPeriod.end),
    getMedicationClasses(doctorId, currentPeriod.start, currentPeriod.end),
    getAdherenceRates(doctorId),
    getInteractionStats(doctorId, currentPeriod.start, currentPeriod.end)
  ]);

  return {
    prescriptions: {
      stats: prescriptionStats,
      medicationClasses,
      adherenceRates,
      interactions
    }
  };
}

/**
 * Get performance analytics
 */
async function getPerformanceAnalytics(doctorId: string, currentPeriod: any, previousPeriod: any) {
  const [
    efficiency,
    satisfaction,
    quality,
    workload
  ] = await Promise.all([
    getEfficiencyMetrics(doctorId, currentPeriod.start, currentPeriod.end),
    getSatisfactionMetrics(doctorId, currentPeriod.start, currentPeriod.end),
    getQualityMetrics(doctorId, currentPeriod.start, currentPeriod.end),
    getWorkloadMetrics(doctorId, currentPeriod.start, currentPeriod.end)
  ]);

  return {
    performance: {
      efficiency,
      satisfaction,
      quality,
      workload
    }
  };
}

/**
 * Helper function to get basic stats
 */
async function getBasicStats(doctorId: string, startDate: Date, endDate: Date) {
  const [
    appointments,
    completedAppointments,
    newPatients,
    prescriptions,
    activePrescriptions,
    triageAssignments
  ] = await Promise.all([
    prisma.scheduleSlot.count({
      where: {
        providerId: doctorId,
        startTime: { gte: startDate, lte: endDate }
      }
    }),
    prisma.scheduleSlot.count({
      where: {
        providerId: doctorId,
        startTime: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      }
    }),
    prisma.patient.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        OR: [
          { PatientTriage: { some: { assignedToId: doctorId } } },
          { ScheduleSlot: { some: { providerId: doctorId } } }
        ]
      }
    }),
    prisma.prescription.count({
      where: {
        prescribedBy: doctorId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.prescription.count({
      where: {
        prescribedBy: doctorId,
        status: 'ACTIVE'
      }
    }),
    prisma.patientTriage.count({
      where: {
        assignedToId: doctorId,
        createdAt: { gte: startDate, lte: endDate }
      }
    })
  ]);

  return {
    appointments,
    completedAppointments,
    newPatients,
    prescriptions,
    activePrescriptions,
    triageAssignments,
    completionRate: appointments > 0 ? (completedAppointments / appointments) * 100 : 0
  };
}

/**
 * Helper function to calculate growth percentages
 */
function calculateGrowth(current: any, previous: any) {
  const calculatePercentage = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return {
    appointments: calculatePercentage(current.appointments, previous.appointments),
    newPatients: calculatePercentage(current.newPatients, previous.newPatients),
    prescriptions: calculatePercentage(current.prescriptions, previous.prescriptions),
    triageAssignments: calculatePercentage(current.triageAssignments, previous.triageAssignments),
    completionRate: current.completionRate - previous.completionRate
  };
}

/**
 * Additional helper functions for detailed analytics
 */

async function getTotalPatients(doctorId: string) {
  return prisma.patient.count({
    where: {
      OR: [
        { PatientTriage: { some: { assignedToId: doctorId } } },
        { ScheduleSlot: { some: { providerId: doctorId } } }
      ]
    }
  });
}

async function getTotalPrescriptions(doctorId: string) {
  return prisma.prescription.count({
    where: { prescribedBy: doctorId }
  });
}

async function getRecentActivity(doctorId: string) {
  const [recentAppointments, recentPrescriptions, recentTriages] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { providerId: doctorId },
      include: {
        Patient: { select: { firstName: true, lastName: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 5
    }),
    prisma.prescription.findMany({
      where: { prescribedBy: doctorId },
      include: {
        Patient: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.patientTriage.findMany({
      where: { assignedToId: doctorId },
      include: {
        Patient: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  return {
    recentAppointments: recentAppointments.map(apt => ({
      id: apt.id,
      patient: `${apt.Patient?.firstName} ${apt.Patient?.lastName}`,
      startTime: apt.startTime,
      status: apt.status,
      type: apt.appointmentType
    })),
    recentPrescriptions: recentPrescriptions.map(rx => ({
      id: rx.id,
      patient: `${rx.Patient?.firstName} ${rx.Patient?.lastName}`,
      medication: rx.medicationName,
      createdAt: rx.createdAt,
      status: rx.status
    })),
    recentTriages: recentTriages.map(triage => ({
      id: triage.id,
      patient: `${triage.Patient?.firstName} ${triage.Patient?.lastName}`,
      urgency: triage.urgencyLevel,
      createdAt: triage.createdAt,
      status: triage.status
    }))
  };
}

// Placeholder implementations for additional analytics functions
async function getPatientStats(doctorId: string, startDate: Date, endDate: Date) {
  return { newPatients: 0, returningPatients: 0, totalVisits: 0 };
}

async function getPatientDemographics(doctorId: string) {
  return { ageGroups: [], genderDistribution: [], conditions: [] };
}

async function getPatientConditions(doctorId: string, startDate: Date, endDate: Date) {
  return { topConditions: [], chronicConditions: [] };
}

async function getPatientOutcomes(doctorId: string, startDate: Date, endDate: Date) {
  return { improvementRate: 0, satisfactionScore: 0 };
}

async function getAppointmentStats(doctorId: string, startDate: Date, endDate: Date) {
  return { total: 0, completed: 0, cancelled: 0, noShow: 0 };
}

async function getAppointmentTrends(doctorId: string, startDate: Date, endDate: Date) {
  return { dailyTrends: [], weeklyTrends: [] };
}

async function getAppointmentTypes(doctorId: string, startDate: Date, endDate: Date) {
  return { consultation: 0, followUp: 0, emergency: 0 };
}

async function getTimeDistribution(doctorId: string, startDate: Date, endDate: Date) {
  return { hourlyDistribution: [], dayDistribution: [] };
}

async function getNoShowRate(doctorId: string, startDate: Date, endDate: Date) {
  return { rate: 0, trend: 0 };
}

async function getPrescriptionStats(doctorId: string, startDate: Date, endDate: Date) {
  return { total: 0, active: 0, completed: 0 };
}

async function getMedicationClasses(doctorId: string, startDate: Date, endDate: Date) {
  return { topClasses: [] };
}

async function getAdherenceRates(doctorId: string) {
  return { adherenceRate: 0, factors: [] };
}

async function getInteractionStats(doctorId: string, startDate: Date, endDate: Date) {
  return { interactions: 0, severity: [] };
}

async function getEfficiencyMetrics(doctorId: string, startDate: Date, endDate: Date) {
  return { appointmentDuration: 0, patientThroughput: 0 };
}

async function getSatisfactionMetrics(doctorId: string, startDate: Date, endDate: Date) {
  return { rating: 0, feedback: [] };
}

async function getQualityMetrics(doctorId: string, startDate: Date, endDate: Date) {
  return { qualityScore: 0, metrics: [] };
}

async function getWorkloadMetrics(doctorId: string, startDate: Date, endDate: Date) {
  return { utilizationRate: 0, capacity: 0 };
}

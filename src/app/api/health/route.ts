import { NextResponse } from 'next/server';
import os from 'os';
import process from 'process';
import { PrismaClient } from '@prisma/client';

// Create a health-check API endpoint
export async function GET() {
  try {
    // Check database connection
    let databaseConnected = false;
    let dbError = null;
    
    try {
      const prisma = new PrismaClient();
      // Try a simple query to test the connection
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
      await prisma.$disconnect();
    } catch (error) {
      dbError = error.message;
    }

    // Calculate server uptime
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptime = `${hours}h ${minutes}m ${seconds}s`;

    // Get Next.js version from package.json
    const nextVersion = process.env.npm_package_dependencies_next || '15.3.2';
    
    // Return health check data
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      nextVersion,
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
        },
      },
      process: {
        pid: process.pid,
        uptime,
      },
      database: {
        connected: databaseConnected,
        error: dbError,
      },
      auth: {
        provider: 'JWT',
        available: true,
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

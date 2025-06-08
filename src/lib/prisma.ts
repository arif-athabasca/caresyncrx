/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Singleton Prisma client for the CareSyncRx platform.
 * Enhanced to handle both client and server environments.
 */

import { PrismaClient } from '@prisma/client';

// Global type declaration for PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Initialize PrismaClient safely in any environment
 */
function getPrismaClient() {
  // In production, each instance will have its own client
  // In development, we'll share a single instance to avoid database connection issues
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error'],
    });
  }
  
  // For development and testing, reuse the existing connection
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  
  return global.prisma;
}

// Initialize the client
const prismaClient = getPrismaClient();

// Export both as default and named export for flexibility
export default prismaClient;
export const prisma = prismaClient;
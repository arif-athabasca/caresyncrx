/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Singleton Prisma client for the CareSyncRx platform.
 */

import { PrismaClient } from '@prisma/client';

// Global type declaration for PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prismaClient = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV === 'development') {
  global.prisma = prismaClient;
}

// Export both as default and named export for flexibility
export default prismaClient;
export const prisma = prismaClient;
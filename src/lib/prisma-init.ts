/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Server-side Prisma initializer
 * This file ensures Prisma is properly initialized for server components and API routes
 */

// Import the PrismaClient constructor
import { PrismaClient } from '@prisma/client';

// Function to ensure Prisma client is properly initialized
// This is especially important in serverless environments
export function ensurePrismaInitialized() {
  try {
    // Try to create a test instance to verify client is generated
    const testClient = new PrismaClient();
    testClient.$disconnect();
    return true;
  } catch (error: any) {
    // If this error occurs, it means the client hasn't been properly generated
    if (error.message?.includes('did not initialize yet') || 
        error.message?.includes('run "prisma generate"')) {
      console.error('Prisma client not initialized. Run "npx prisma generate"');
      return false;
    }
    // For other errors, just log them
    console.error('Error initializing Prisma:', error);
    return false;
  }
}

// Verify Prisma is initialized when this module is imported
ensurePrismaInitialized();

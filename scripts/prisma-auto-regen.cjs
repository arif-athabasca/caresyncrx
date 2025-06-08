#!/usr/bin/env node

/**
 * Prisma Auto-Regeneration Script
 * 
 * This script checks if Prisma client needs to be regenerated and does so if needed.
 * It's meant to be run before starting the development server.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if Prisma client needs regeneration
function needsRegeneration() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const clientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
  
  // If client doesn't exist, regenerate
  if (!fs.existsSync(clientPath)) {
    console.log('Prisma client not found. Regenerating...');
    return true;
  }
  
  // If schema is newer than client, regenerate
  const schemaTime = fs.statSync(schemaPath).mtime;
  const clientTime = fs.statSync(clientPath).mtime;
  
  if (schemaTime > clientTime) {
    console.log('Schema changed since last generation. Regenerating Prisma client...');
    return true;
  }
  
  return false;
}

// Main function
function main() {
  try {
    console.log('Checking Prisma client status...');
    
    if (needsRegeneration()) {
      console.log('Running prisma generate...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('Prisma client successfully regenerated!');
    } else {
      console.log('Prisma client is up to date.');
    }
  } catch (error) {
    console.error('Error regenerating Prisma client:', error);
    process.exit(1);
  }
}

// Run the script
main();

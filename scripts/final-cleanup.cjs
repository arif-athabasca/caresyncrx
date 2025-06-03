/**
 * Final Cleanup Script
 * 
 * This script removes the last remaining redundant files from the CareSyncRx project.
 */

const fs = require('fs');
const path = require('path');

// Files to delete
const filesToDelete = [
  // Duplicate compatibility files (keeping only the original)
  'scripts/copy-compat-files-new.cjs',
  
  // Redundant check scripts (keeping only essential ones)
  'scripts/check-module-resolution.cjs',
  
  // Redundant security audit scripts (already covered by other scripts)
  'scripts/run-security-audit.cjs',
  'scripts/security-audit-service.cjs',
  
  // Duplicate server scripts (Start-DevServer.ps1 is redundant with start-dev.cmd)
  'scripts/Start-DevServer.ps1',
  
  // Redundant test scripts (functionality covered by Test-CareSyncRx.ps1)
  'scripts/create-test-clinic.cjs',
  
  // Other redundant scripts
  'scripts/prisma-migrate-security.js',
  'scripts/restore-config.py',
  'scripts/turbopack-compatible-dev.cjs'
];

console.log('=== CareSyncRx Final Cleanup ===');
console.log('Removing remaining redundant files...');

let deletedCount = 0;
let notFoundCount = 0;
let errorCount = 0;

for (const relativePath of filesToDelete) {
  const fullPath = path.join(__dirname, '..', ...relativePath.split('/'));
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted: ${relativePath}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Error deleting ${relativePath}: ${error.message}`);
      errorCount++;
    }
  } else {
    console.log(`ℹ️ File not found: ${relativePath}`);
    notFoundCount++;
  }
}

console.log('\n=== Cleanup Summary ===');
console.log(`✅ Successfully deleted: ${deletedCount} files`);
console.log(`ℹ️ Files not found: ${notFoundCount} files`);
console.log(`❌ Errors encountered: ${errorCount} files`);
console.log('Final cleanup complete!');

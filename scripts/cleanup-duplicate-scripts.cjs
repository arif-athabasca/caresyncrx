/**
 * Cleanup Duplicate Scripts
 * 
 * This script removes duplicate development and test scripts
 * to simplify the codebase structure.
 */

const fs = require('fs');
const path = require('path');

// Files to delete (keeping only the most important versions)
const filesToDelete = [
  // Duplicate start-dev scripts (keeping only root start-dev.js and start-dev.cmd)
  'scripts/start-dev.js',
  'scripts/start-dev.cjs',
  
  // Redundant test scripts (keeping only Test-CareSyncRx.ps1)
  'scripts/Test-IdleTimeout.ps1',
  'scripts/Test-NewBrowserBackButton.ps1',
  
  // Redundant cleanup scripts (keeping only cleanup-redundant-files.cjs and cleanup-empty-files.cjs)
  'scripts/cleanup-codebase.cjs',
  'scripts/pre-build-cleanup.cjs'
];

console.log('=== CareSyncRx Duplicate Scripts Cleanup ===');
console.log('Removing duplicate script files...');

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
console.log('Duplicate scripts cleanup complete!');

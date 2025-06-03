/**
 * Cleanup Redundant Files Script
 * 
 * This script removes unnecessary files from the CareSyncRx project:
 * - .new and .fixed files (temporary files from development)
 * - Redundant cleanup scripts
 * - Redundant import fix scripts
 * - Duplicate documentation files
 */

const fs = require('fs');
const path = require('path');

// Files to delete
const filesToDelete = [
  // .new files
  'src/auth.ts.new',
  'src/auth/utils/token-util.js.new',
  'src/auth/utils/edge-safe-hash.js.new',
  'src/auth/index.ts.new',
  'src/auth/enums.js.new',
  'src/auth/services/models/auth-models.ts.new',
  'src/auth/config/auth-config.js.new',
  'package.json.new',
  'src/app/api/auth/refresh/route.ts.new',
  
  // .fixed files
  'package.json.fixed',
  'src/app/admin/dashboard/page.tsx.fixed',
  'src/app/admin/triage/new/page.tsx.fixed',
  'src/app/api/auth/refresh/route.ts.fixed',
  'src/app/api/auth/forgot-password/route.ts.fixed',
  'src/app/api/auth/2fa/verify/route.ts.fixed',
  'src/app/api/auth/2fa/login-verify/route.ts.fixed',
  
  // Redundant cleanup scripts
  'scripts/Cleanup-FixedFiles.ps1',
  'scripts/Cleanup.ps1',
  'scripts/Cleanup-RedundantFiles.ps1',
  'scripts/Cleanup-RedundantAuthFiles.ps1',
  'scripts/Final-Cleanup.ps1',
  'scripts/Master-Cleanup.ps1',
  'scripts/Simple-Cleanup.ps1',
  'scripts/Comprehensive-Cleanup.ps1',
  
  // Redundant import fix scripts (keeping only fix-remaining-imports.cjs as the main one)
  'scripts/fix-auth-imports.cjs',
  'scripts/fix-imports.cjs',
  'scripts/fix-compiled-imports.cjs',
  'scripts/fix-circular-deps.cjs',
  'scripts/fix-all-imports.cjs',
  
  // Redundant documentation
  'docs/codebase-cleanup-notes.md',
  'docs/codebase-cleanup.md'
];

console.log('=== CareSyncRx Redundant Files Cleanup ===');
console.log('Removing unnecessary files...');

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
console.log('Cleanup complete!');

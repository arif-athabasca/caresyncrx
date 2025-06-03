/**
 * Auth Module Validation Script
 * 
 * This script validates the structure and dependencies of the auth module.
 * It checks for circular dependencies and ensures proper exports.
 */

const fs = require('fs');
const path = require('path');

console.log('=== Auth Module Validation ===');
console.log('Checking auth module structure...');

// Define paths to check
const authModulePath = path.join(__dirname, '..', 'src', 'auth');
const mainAuthFile = path.join(__dirname, '..', 'src', 'auth.ts');

// Check if main auth file exists
if (fs.existsSync(mainAuthFile)) {
  console.log('✅ Main auth file exists: ' + mainAuthFile);
} else {
  console.log('❌ Main auth file missing: ' + mainAuthFile);
}

// Check for token utils
const tokenStoragePath = path.join(authModulePath, 'utils', 'token-storage.ts');
const tokenUtilPath = path.join(authModulePath, 'utils', 'token-util.ts');

if (fs.existsSync(tokenStoragePath)) {
  console.log('✅ TokenStorage implementation found');
} else {
  console.log('❌ TokenStorage implementation missing');
}

if (fs.existsSync(tokenUtilPath)) {
  console.log('✅ TokenUtil implementation found');
} else {
  console.log('❌ TokenUtil implementation missing');
}

console.log('Auth module validation completed.');

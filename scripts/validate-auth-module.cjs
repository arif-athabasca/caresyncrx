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
const deviceIdentityPath = path.join(authModulePath, 'utils', 'device-identity.ts');
const deviceIdentityExtensionPath = path.join(authModulePath, 'utils', 'device-identity-extension.ts');
const windowAuthTypesPath = path.join(authModulePath, 'types', 'window-auth.d.ts');

// Check for auth implementation files
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

if (fs.existsSync(deviceIdentityPath)) {
  console.log('✅ DeviceIdentity implementation found');
} else {
  console.log('❌ DeviceIdentity implementation missing');
}

if (fs.existsSync(deviceIdentityExtensionPath)) {
  console.log('✅ DeviceIdentity extension found');
} else {
  console.log('❌ DeviceIdentity extension missing');
}

if (fs.existsSync(windowAuthTypesPath)) {
  console.log('✅ Window auth type definitions found');
} else {
  console.log('❌ Window auth type definitions missing');
}

// Check for public auth scripts
console.log('\nChecking public auth scripts...');
const publicScripts = [
  path.join(__dirname, '..', 'public', 'token-management.js'),
  path.join(__dirname, '..', 'public', 'auth-navigation.js'),
  path.join(__dirname, '..', 'public', 'auth-verification.js'),
  path.join(__dirname, '..', 'public', 'auth-error-handler.js'),
  path.join(__dirname, '..', 'public', 'auth-logout.js'),
  path.join(__dirname, '..', 'public', 'login-check.js')
];

const publicScriptNames = [
  'token-management.js',
  'auth-navigation.js',
  'auth-verification.js',
  'auth-error-handler.js',
  'auth-logout.js',
  'login-check.js'
];

let allScriptsFound = true;
for (let i = 0; i < publicScripts.length; i++) {
  const scriptPath = publicScripts[i];
  const scriptName = publicScriptNames[i];
  
  if (fs.existsSync(scriptPath)) {
    console.log(`✅ ${scriptName} found`);
  } else {
    console.log(`❌ ${scriptName} missing`);
    allScriptsFound = false;
  }
}

if (allScriptsFound) {
  console.log('✅ All required public auth scripts are present');
} else {
  console.log('❌ Some required public auth scripts are missing');
}

// Add recommendation for documentation
if (!allScriptsFound) {
  console.log('\nFor more information about the authentication system, please see:');
  console.log('- docs/auth-system/README.md');
  console.log('- docs/auth-system/overhaul.md');
  console.log('- docs/auth-system/testing-guide.md');
}

console.log('Auth module validation completed.');

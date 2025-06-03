#!/usr/bin/env node
/**
 * Final Validation Script for CareSyncRx
 * 
 * This script runs a comprehensive set of checks to ensure the codebase is ready for GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname, '..');

// ANSI colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

// Banner
console.log(`${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}       CareSyncRx Final GitHub Validation           ${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
console.log();

// Track validation results
const validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Validation functions
function validateFile(filePath, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ Missing: ${description} (${filePath})${colors.reset}`);
      validationResults.failed++;
      return false;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.log(`${colors.yellow}⚠️ Warning: ${description} is empty (${filePath})${colors.reset}`);
      validationResults.warnings++;
      return false;
    }
    
    console.log(`${colors.green}✅ Found: ${description} (${filePath})${colors.reset}`);
    validationResults.passed++;
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Error checking ${filePath}: ${error.message}${colors.reset}`);
    validationResults.failed++;
    return false;
  }
}

function validateDirectory(dirPath, description) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`${colors.red}❌ Missing: ${description} directory (${dirPath})${colors.reset}`);
      validationResults.failed++;
      return false;
    }
    
    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      console.log(`${colors.red}❌ Error: ${dirPath} is not a directory${colors.reset}`);
      validationResults.failed++;
      return false;
    }
    
    console.log(`${colors.green}✅ Found: ${description} directory (${dirPath})${colors.reset}`);
    validationResults.passed++;
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Error checking ${dirPath}: ${error.message}${colors.reset}`);
    validationResults.failed++;
    return false;
  }
}

function validateJsonFile(filePath, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.red}❌ Missing: ${description} (${filePath})${colors.reset}`);
      validationResults.failed++;
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.trim() === '') {
      console.log(`${colors.yellow}⚠️ Warning: ${description} is empty (${filePath})${colors.reset}`);
      validationResults.warnings++;
      return false;
    }
    
    try {
      JSON.parse(content);
      console.log(`${colors.green}✅ Valid: ${description} (${filePath})${colors.reset}`);
      validationResults.passed++;
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Invalid JSON: ${description} (${filePath})${colors.reset}`);
      validationResults.failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error checking ${filePath}: ${error.message}${colors.reset}`);
    validationResults.failed++;
    return false;
  }
}

function validateAuthModule() {
  console.log(`\n${colors.cyan}Validating Auth Module Structure...${colors.reset}`);
  
  // Check critical files exist
  const criticalFiles = [
    { path: path.join(rootDir, 'src', 'auth.ts'), description: 'Main auth module entry point' },
    { path: path.join(rootDir, 'src', 'auth', 'utils', 'index.ts'), description: 'Auth utils index' },
    { path: path.join(rootDir, 'src', 'auth', 'utils', 'token-storage.ts'), description: 'Token storage utility' },
    { path: path.join(rootDir, 'src', 'auth', 'utils', 'token-util.ts'), description: 'Token utility' },
    { path: path.join(rootDir, 'src', 'auth', 'utils', 'password-validator.ts'), description: 'Password validator' },
    { path: path.join(rootDir, 'src', 'auth', 'services', 'implementations', 'AuthService.ts'), description: 'Auth service implementation' },
    { path: path.join(rootDir, 'src', 'auth', 'services', 'implementations', 'TwoFactorAuthService.ts'), description: 'Two-factor auth service' }
  ];
  
  for (const file of criticalFiles) {
    validateFile(file.path, file.description);
  }
}

function validateMainFiles() {
  console.log(`\n${colors.cyan}Validating Essential Project Files...${colors.reset}`);
  
  // Check essential files
  const essentialFiles = [
    { path: path.join(rootDir, 'package.json'), description: 'package.json', json: true },
    { path: path.join(rootDir, 'next.config.ts'), description: 'Next.js config' },
    { path: path.join(rootDir, 'tsconfig.json'), description: 'TypeScript config', json: true },
    { path: path.join(rootDir, 'middleware.ts'), description: 'Next.js middleware' },
    { path: path.join(rootDir, 'README.md'), description: 'README file' },
    { path: path.join(rootDir, '.gitignore'), description: 'Git ignore file' },
    { path: path.join(rootDir, 'docs', 'circular-dependency-resolution.md'), description: 'Circular dependency documentation' }
  ];
  
  for (const file of essentialFiles) {
    if (file.json) {
      validateJsonFile(file.path, file.description);
    } else {
      validateFile(file.path, file.description);
    }
  }
}

function validateDirectoryStructure() {
  console.log(`\n${colors.cyan}Validating Directory Structure...${colors.reset}`);
  
  // Check essential directories
  const essentialDirs = [
    { path: path.join(rootDir, 'src'), description: 'Source code' },
    { path: path.join(rootDir, 'src', 'app'), description: 'Next.js app directory' },
    { path: path.join(rootDir, 'src', 'auth'), description: 'Auth module' },
    { path: path.join(rootDir, 'docs'), description: 'Documentation' },
    { path: path.join(rootDir, 'scripts'), description: 'Scripts' },
    { path: path.join(rootDir, 'public'), description: 'Public assets' }
  ];
  
  for (const dir of essentialDirs) {
    validateDirectory(dir.path, dir.description);
  }
}

function validateGitHubPreparationScripts() {
  console.log(`\n${colors.cyan}Validating GitHub Preparation Scripts...${colors.reset}`);
  
  // Check GitHub preparation scripts
  const scripts = [
    { path: path.join(rootDir, 'scripts', 'validate-auth-module.cjs'), description: 'Auth module validation script' },
    { path: path.join(rootDir, 'scripts', 'fix-remaining-imports.cjs'), description: 'Import fix script' },
    { path: path.join(rootDir, 'scripts', 'final-github-prep.ps1'), description: 'Final GitHub preparation script' },
    { path: path.join(rootDir, 'scripts', 'enhanced-github-prep.ps1'), description: 'Enhanced GitHub preparation script' }
  ];
  
  for (const script of scripts) {
    validateFile(script.path, script.description);
  }
}

function checkForEmptyFiles() {
  console.log(`\n${colors.cyan}Checking for Empty Files...${colors.reset}`);
  
  try {
    let emptyFilesCount = 0;
    const files = getAllFiles(rootDir);
    
    for (const file of files) {
      const stats = fs.statSync(file);
      if (stats.size === 0) {
        console.log(`${colors.yellow}⚠️ Empty file: ${path.relative(rootDir, file)}${colors.reset}`);
        emptyFilesCount++;
      }
    }
    
    if (emptyFilesCount === 0) {
      console.log(`${colors.green}✅ No empty files found${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Found ${emptyFilesCount} empty files${colors.reset}`);
      validationResults.warnings += emptyFilesCount;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error checking for empty files: ${error.message}${colors.reset}`);
    validationResults.failed++;
  }
}

function getAllFiles(directory, extensions = ['.js', '.ts', '.jsx', '.tsx', '.md', '.json', '.html']) {
  const files = [];
  
  function traverseDirectory(currentPath) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);
      
      // Skip node_modules and other build/cache directories
      if (item.isDirectory() && 
          !['node_modules', '.next', '.git', '.vercel', '.swc', 'coverage'].includes(item.name)) {
        traverseDirectory(itemPath);
      } else if (item.isFile() && 
                (extensions.length === 0 || extensions.includes(path.extname(item.name)))) {
        files.push(itemPath);
      }
    }
  }
  
  traverseDirectory(directory);
  return files;
}

// Main execution
try {
  validateMainFiles();
  validateDirectoryStructure();
  validateAuthModule();
  validateGitHubPreparationScripts();
  checkForEmptyFiles();
  
  // Summary
  console.log(`\n${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}                  Validation Results                 ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${validationResults.passed} checks${colors.reset}`);
  console.log(`${colors.yellow}⚠️ Warnings: ${validationResults.warnings} issues${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${validationResults.failed} checks${colors.reset}`);
  console.log();
  
  if (validationResults.failed > 0) {
    console.log(`${colors.red}The codebase has ${validationResults.failed} critical issues that should be fixed before uploading to GitHub.${colors.reset}`);
    process.exit(1);
  } else if (validationResults.warnings > 0) {
    console.log(`${colors.yellow}The codebase has ${validationResults.warnings} warnings, but is generally ready for GitHub.${colors.reset}`);
    console.log(`${colors.yellow}Consider running the cleanup scripts to address these warnings.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.green}The codebase is ready for GitHub! All validation checks passed.${colors.reset}`);
    process.exit(0);
  }
} catch (error) {
  console.error(`${colors.red}Error during validation: ${error.message}${colors.reset}`);
  process.exit(1);
}

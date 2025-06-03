# CareSyncRx Scripts Directory

This directory contains utility scripts for development, testing, and maintenance of the CareSyncRx application.

## Development Scripts

- **check-port.cjs** - Utility to check if port 3000 is in use
- **copy-compat-files.cjs** - Copies compatibility files for different runtime environments
- **quick-build-test.cjs** - Fast build testing without full compilation

## GitHub Preparation Scripts

- **validate-auth-module.cjs** - Validates the structure of the auth module
- **fix-remaining-imports.cjs** - Fixes any remaining problematic imports
- **final-validation.cjs** - Final validation of the codebase before GitHub submission
- **final-github-prep.ps1** - PowerShell script for final GitHub preparation
- **enhanced-github-prep.ps1** - Enhanced version of GitHub preparation

## Testing Scripts

- **test-app-functionality.cjs** - Tests core application functionality
- **test-security-logging.cjs** - Tests security logging features
- **Test-SecurityImplementation.ps1** - Runs comprehensive security implementation tests

## Cleanup Scripts

- **cleanup-empty-files.cjs** - Cleans up empty files from the codebase
- **cleanup-redundant-files.cjs** - Removes redundant files with duplicate functionality
- **cleanup-duplicate-scripts.cjs** - Removes duplicate script files
- **final-cleanup.cjs** - Final cleanup of any remaining unnecessary files

## Usage

Most scripts can be run through npm scripts defined in package.json:

```bash
# Run development server
npm run dev:clean

# Validate auth module
npm run validate:auth

# Run cleanup scripts
npm run cleanup:all

# Prepare for GitHub
npm run github:final
```

## Note on Import Fixes

The `fix-remaining-imports.cjs` script is the main script used for fixing circular dependencies in the codebase. It:

1. Scans for potential circular dependencies
2. Fixes problematic import patterns
3. Ensures code is optimized for GitHub

This script is part of the GitHub preparation process.

## Usage Notes

1. PowerShell scripts (.ps1) are primarily for Windows development environments
2. Node.js scripts (.cjs, .js) are for cross-platform compatibility
3. For security testing, refer to the documentation in the `/docs` directory

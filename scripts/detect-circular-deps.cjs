/**
 * Circular Dependency Detection Script
 * 
 * This script analyzes the project to detect circular dependencies 
 * that could be causing the ChunkLoadError in webpack.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configure paths to check
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const EXCLUDE_DIRS = ['node_modules', '.next', 'out', 'build'];

// Install madge if not already installed
try {
  console.log('Checking for madge dependency...');
  execSync('npm list madge', { stdio: 'ignore' });
  console.log('Madge is already installed.');
} catch (error) {
  console.log('Installing madge for circular dependency detection...');
  execSync('npm install --no-save madge', { stdio: 'inherit' });
}

// Run analysis using madge
console.log('\n=== Analyzing circular dependencies ===\n');

try {
  // Check for circular dependencies in the entire src directory
  console.log('Checking for circular dependencies in src directory...');
  const output = execSync(`npx madge --circular --extensions ts,tsx,js,jsx ${SRC_DIR}`, { encoding: 'utf8' });
  
  if (output.trim()) {
    console.log('\n🔄 CIRCULAR DEPENDENCIES DETECTED:\n');
    console.log(output);
    
    // Extract main circular dependencies
    const circularPaths = output.split('\n')
      .filter(line => line.includes(' -> '))
      .map(line => line.trim());
    
    if (circularPaths.length > 0) {
      console.log('\n=== SUGGESTED FIXES ===\n');
      circularPaths.forEach(circPath => {
        const modules = circPath.split(' -> ');
        console.log(`Circular dependency chain: ${circPath}`);
        console.log(`- Consider breaking the dependency between ${modules[0]} and ${modules[modules.length-1]}`);
        console.log(`- Extract shared logic into a separate utility module`);
        console.log(`- Use dynamic imports for non-critical dependencies\n`);
      });
    }
  } else {
    console.log('✅ No circular dependencies detected in src directory.');
  }
  
  // Specific check for the auth module
  console.log('\nChecking for circular dependencies in auth module...');
  const authOutput = execSync(`npx madge --circular --extensions ts,tsx,js,jsx ${path.join(SRC_DIR, 'auth')}`, { encoding: 'utf8' });
  
  if (authOutput.trim()) {
    console.log('\n🔄 CIRCULAR DEPENDENCIES DETECTED IN AUTH MODULE:\n');
    console.log(authOutput);
  } else {
    console.log('✅ No circular dependencies detected in auth module.');
  }
  
} catch (error) {
  console.error('Error analyzing dependencies:', error.message);
  if (error.stdout) console.log(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
}

// Additional webpack analysis
console.log('\n=== Analyzing webpack chunks ===\n');

const NEXT_DIR = path.join(ROOT_DIR, '.next');
if (fs.existsSync(NEXT_DIR)) {
  try {
    // Check for large chunks
    console.log('Checking for unusually large webpack chunks...');
    const serverChunksDir = path.join(NEXT_DIR, 'server/chunks');
    const staticChunksDir = path.join(NEXT_DIR, 'static/chunks');
    
    // Helper to analyze chunks
    const analyzeChunks = (dir) => {
      if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
      }
      
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.js'))
        .map(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            path: filePath
          };
        })
        .sort((a, b) => b.size - a.size);
      
      // Report on the largest chunks
      if (files.length > 0) {
        console.log(`\nLargest chunks in ${path.basename(dir)}:`);
        files.slice(0, 5).forEach(file => {
          console.log(`- ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        });
      }
    };
    
    analyzeChunks(serverChunksDir);
    analyzeChunks(staticChunksDir);
    
  } catch (error) {
    console.error('Error analyzing webpack chunks:', error.message);
  }
} else {
  console.log('Next.js build directory not found. Run a build first to analyze webpack chunks.');
}

console.log('\n=== Analysis complete ===\n');
console.log('If circular dependencies were found, fix them by:');
console.log('1. Using direct imports instead of aliases');
console.log('2. Breaking circular dependencies into separate modules');
console.log('3. Using dynamic imports for lazy loading');
console.log('4. Implementing singleton patterns for shared services');

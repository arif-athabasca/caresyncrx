/**
 * Token Storage Methods Test
 * 
 * This script tests all TokenStorage methods to ensure they are properly implemented
 * Run this script to verify the TokenStorage functionality
 */

// Fix the path to use the correct relative path
const { TokenStorage } = require('../src/auth/utils/token-storage');

// Test Data
const testAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const testRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.F4kqEjVXRxRgYMi1Qqj_oAHfSxR8Fs6a_HJJWlw0xxM';
const testExpiry = Date.now() + 3600000; // 1 hour from now

// Test Results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Run a test and record the result
 */
function runTest(name, test) {
  try {
    const result = test();
    if (result === true) {
      console.log(`✅ PASSED: ${name}`);
      results.passed++;
    } else {
      console.log(`❌ FAILED: ${name}`);
      results.failed++;
      results.errors.push(`Test failed: ${name}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${name}`);
    console.error(error);
    results.failed++;
    results.errors.push(`Error in test: ${name} - ${error.message}`);
  }
}

// Run the tests
console.log('=== TokenStorage Methods Test ===\n');

// Test setAccessToken and getAccessToken
runTest('setAccessToken and getAccessToken', () => {
  TokenStorage.setAccessToken(testAccessToken);
  return TokenStorage.getAccessToken() === testAccessToken;
});

// Test setRefreshToken and getRefreshToken
runTest('setRefreshToken and getRefreshToken', () => {
  TokenStorage.setRefreshToken(testRefreshToken);
  return TokenStorage.getRefreshToken() === testRefreshToken;
});

// Test setExpiresAt and getExpiresAt
runTest('setExpiresAt and getExpiresAt', () => {
  TokenStorage.setExpiresAt(testExpiry);
  return TokenStorage.getExpiresAt() === testExpiry;
});

// Test validateTokenFormat
runTest('validateTokenFormat with valid token', () => {
  return TokenStorage.validateTokenFormat(testAccessToken) === true;
});

runTest('validateTokenFormat with invalid token', () => {
  return TokenStorage.validateTokenFormat('invalid-token') === false;
});

runTest('validateTokenFormat with null', () => {
  return TokenStorage.validateTokenFormat(null) === false;
});

// Test isTokenExpired and isAccessTokenExpired
runTest('isTokenExpired with non-expired token', () => {
  TokenStorage.setExpiresAt(Date.now() + 3600000);
  return TokenStorage.isTokenExpired() === false;
});

runTest('isAccessTokenExpired alias', () => {
  const directResult = TokenStorage.isTokenExpired();
  const aliasResult = TokenStorage.isAccessTokenExpired();
  return directResult === aliasResult;
});

// Test markBfCacheRestoration
runTest('markBfCacheRestoration', () => {
  try {
    TokenStorage.markBfCacheRestoration();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

// Test clearTokens
runTest('clearTokens', () => {
  TokenStorage.clearTokens();
  return TokenStorage.getAccessToken() === null && 
         TokenStorage.getRefreshToken() === null && 
         TokenStorage.getExpiresAt() === null;
});

// Print final results
console.log('\n=== Test Results ===');
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
if (results.failed > 0) {
  console.log('\nErrors:');
  results.errors.forEach(error => console.log(`- ${error}`));
}

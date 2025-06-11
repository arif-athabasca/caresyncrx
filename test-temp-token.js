/**
 * Quick test to verify the generateTempToken method works correctly
 */

const { TokenUtil } = require('./src/auth/utils/token-util.js');

// Test the generateTempToken method
const testPayload = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'NURSE'
};

console.log('Testing TokenUtil.generateTempToken...');

try {
  const tempToken = TokenUtil.generateTempToken(testPayload, 'test-device-id');
  console.log('✅ Token generated successfully');
  console.log('Token length:', tempToken.length);
  console.log('Token prefix:', tempToken.substring(0, 20) + '...');
  
  // Test verification
  const { TokenType } = require('./src/auth/enums');
  const verified = TokenUtil.verifyToken(tempToken, TokenType.TEMP);
  
  if (verified) {
    console.log('✅ Token verification successful');
    console.log('Verified payload:', {
      id: verified.id,
      email: verified.email,
      role: verified.role,
      temp: verified.temp,
      type: verified.type
    });
  } else {
    console.log('❌ Token verification failed');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

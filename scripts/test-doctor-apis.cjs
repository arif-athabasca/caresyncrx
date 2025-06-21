#!/usr/bin/env node

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Test script for Doctor Dashboard APIs
 * Tests all endpoints for functionality, data validation, and security
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  doctor: {
    email: 'dr.james.thompson@caresync.com',
    password: 'CareSyncRx2024!'
  },
  testPatientId: null, // Will be set during test
  endpoints: [
    '/api/doctor/patients',
    '/api/doctor/appointments', 
    '/api/doctor/prescriptions',
    '/api/doctor/ai-assistant',
    '/api/doctor/analytics',
    '/api/doctor/documentation'
  ]
};

/**
 * Test results tracking
 */
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Utility functions
 */
function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name} - ${details}`);
  }
  testResults.details.push({ name, passed, details });
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `authToken=${global.authToken || ''}`
    }
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    return { response, data, status: response.status };
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error.message);
    return { error: error.message, status: 500 };
  }
}

/**
 * Authentication helper
 */
async function authenticate() {
  console.log('\n🔐 Authenticating...');
  
  const { response, data, status } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_CONFIG.doctor.email,
      password: TEST_CONFIG.doctor.password
    })
  });

  if (status === 200 && data.success) {
    // Extract token from response (implementation depends on your auth system)
    global.authToken = response.headers.get('set-cookie')?.match(/authToken=([^;]+)/)?.[1];
    logTest('Doctor authentication', true);
    return true;
  } else {
    logTest('Doctor authentication', false, data.error || 'Authentication failed');
    return false;
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('\n📊 Setting up test data...');
  
  try {
    // Find or create a test patient
    let testPatient = await prisma.patient.findFirst({
      where: {
        email: { contains: 'test' }
      }
    });

    if (!testPatient) {
      testPatient = await prisma.patient.create({
        data: {
          id: require('crypto').randomUUID(),
          firstName: 'Test',
          lastName: 'Patient',
          email: 'test.patient@example.com',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Other',
          phone: '555-0123',
          address: '123 Test St, Test City, TC 12345',
          medicalHistory: ['Test condition'],
          allergies: ['Test allergy'],
          currentMedications: ['Test medication'],
          clinicId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    TEST_CONFIG.testPatientId = testPatient.id;
    logTest('Test data setup', true);
    return true;
  } catch (error) {
    logTest('Test data setup', false, error.message);
    return false;
  }
}

/**
 * Test doctor/patients endpoint
 */
async function testPatientsEndpoint() {
  console.log('\n👥 Testing Patients API...');
  
  // Test GET patients
  const { data, status } = await makeRequest('/api/doctor/patients');
  logTest('GET /api/doctor/patients', status === 200 && data.success, 
    status !== 200 ? `Status: ${status}` : '');

  if (status === 200 && data.success) {
    logTest('Patients data structure', 
      data.data && data.data.patients && Array.isArray(data.data.patients));
    logTest('Patients summary included', 
      data.data.summary && typeof data.data.summary === 'object');
  }

  // Test POST care action
  const careActionData = {
    patientId: TEST_CONFIG.testPatientId,
    actionType: 'CONSULTATION',
    notes: 'Test care action notes',
    followUpRequired: false
  };

  const { data: postData, status: postStatus } = await makeRequest('/api/doctor/patients', {
    method: 'POST',
    body: JSON.stringify(careActionData)
  });

  logTest('POST /api/doctor/patients (care action)', 
    postStatus === 200 && postData.success,
    postStatus !== 200 ? `Status: ${postStatus}` : '');
}

/**
 * Test doctor/appointments endpoint
 */
async function testAppointmentsEndpoint() {
  console.log('\n📅 Testing Appointments API...');
  
  // Test GET appointments
  const { data, status } = await makeRequest('/api/doctor/appointments');
  logTest('GET /api/doctor/appointments', status === 200 && data.success,
    status !== 200 ? `Status: ${status}` : '');

  if (status === 200 && data.success) {
    logTest('Appointments data structure', 
      data.data && data.data.appointments && Array.isArray(data.data.appointments));
    logTest('Grouped appointments included', 
      data.data.grouped && typeof data.data.grouped === 'object');
  }

  // Test with different timeframes
  const timeframes = ['day', 'week', 'month'];
  for (const timeframe of timeframes) {
    const { status: tfStatus } = await makeRequest(`/api/doctor/appointments?timeframe=${timeframe}`);
    logTest(`GET appointments with timeframe=${timeframe}`, tfStatus === 200);
  }
}

/**
 * Test doctor/prescriptions endpoint
 */
async function testPrescriptionsEndpoint() {
  console.log('\n💊 Testing Prescriptions API...');
  
  // Test GET prescriptions
  const { data, status } = await makeRequest('/api/doctor/prescriptions');
  logTest('GET /api/doctor/prescriptions', status === 200 && data.success,
    status !== 200 ? `Status: ${status}` : '');

  if (status === 200 && data.success) {
    logTest('Prescriptions data structure', 
      data.data && data.data.prescriptions && Array.isArray(data.data.prescriptions));
    logTest('Safety information included', 
      !data.data.prescriptions.length || data.data.prescriptions[0].safety);
  }

  // Test POST prescription
  const prescriptionData = {
    patientId: TEST_CONFIG.testPatientId,
    medicationName: 'Test Medication',
    dosage: '10mg',
    frequency: 'Once daily',
    duration: '30 days',
    instructions: 'Take with food',
    refillsAllowed: 2
  };

  const { data: postData, status: postStatus } = await makeRequest('/api/doctor/prescriptions', {
    method: 'POST',
    body: JSON.stringify(prescriptionData)
  });

  logTest('POST /api/doctor/prescriptions', 
    postStatus === 200 && postData.success,
    postStatus !== 200 ? `Status: ${postStatus}` : '');
}

/**
 * Test doctor/ai-assistant endpoint
 */
async function testAIAssistantEndpoint() {
  console.log('\n🤖 Testing AI Assistant API...');
  
  const testQueries = [
    {
      queryType: 'general_medical',
      query: 'What are the symptoms of hypertension?'
    },
    {
      queryType: 'drug_interaction',
      query: 'Check interactions between warfarin and aspirin'
    },
    {
      queryType: 'clinical_decision',
      query: 'Best treatment for type 2 diabetes',
      context: { patientAge: 45, comorbidities: ['obesity'] }
    }
  ];

  for (const testQuery of testQueries) {
    const { data, status } = await makeRequest('/api/doctor/ai-assistant', {
      method: 'POST',
      body: JSON.stringify(testQuery)
    });

    logTest(`AI Assistant - ${testQuery.queryType}`, 
      status === 200 && data.success,
      status !== 200 ? `Status: ${status}` : '');
  }

  // Test patient analysis (should require consent)
  const patientAnalysisQuery = {
    queryType: 'patient_analysis',
    query: 'Analyze patient risk factors',
    patientId: TEST_CONFIG.testPatientId
  };

  const { data: patientData, status: patientStatus } = await makeRequest('/api/doctor/ai-assistant', {
    method: 'POST',
    body: JSON.stringify(patientAnalysisQuery)
  });

  logTest('AI Assistant - patient analysis consent check', 
    patientStatus === 200 && (patientData.success || patientData.data?.requiresConsent),
    patientStatus !== 200 ? `Status: ${patientStatus}` : '');
}

/**
 * Test doctor/analytics endpoint
 */
async function testAnalyticsEndpoint() {
  console.log('\n📊 Testing Analytics API...');
  
  const metrics = ['overview', 'patients', 'appointments', 'prescriptions', 'performance'];
  const timeframes = ['day', 'week', 'month'];

  for (const metric of metrics) {
    const { data, status } = await makeRequest(`/api/doctor/analytics?metric=${metric}`);
    logTest(`Analytics - ${metric}`, status === 200 && data.success,
      status !== 200 ? `Status: ${status}` : '');
  }

  for (const timeframe of timeframes) {
    const { status } = await makeRequest(`/api/doctor/analytics?timeframe=${timeframe}`);
    logTest(`Analytics - timeframe ${timeframe}`, status === 200);
  }
}

/**
 * Test doctor/documentation endpoint
 */
async function testDocumentationEndpoint() {
  console.log('\n📝 Testing Documentation API...');
  
  // Test GET documentation
  const { data, status } = await makeRequest('/api/doctor/documentation');
  logTest('GET /api/doctor/documentation', status === 200 && data.success,
    status !== 200 ? `Status: ${status}` : '');

  // Test POST clinical note
  const noteData = {
    patientId: TEST_CONFIG.testPatientId,
    title: 'Test Clinical Note',
    noteType: 'clinical_note',
    content: 'This is a test clinical note for API testing purposes.',
    tags: ['test', 'api'],
    isConfidential: false
  };

  const { data: postData, status: postStatus } = await makeRequest('/api/doctor/documentation', {
    method: 'POST',
    body: JSON.stringify(noteData)
  });

  logTest('POST /api/doctor/documentation', 
    postStatus === 200 && postData.success,
    postStatus !== 200 ? `Status: ${postStatus}` : '');

  // Test with template
  const templateNoteData = {
    ...noteData,
    title: 'SOAP Note Test',
    templateId: 'soap_template'
  };

  const { status: templateStatus } = await makeRequest('/api/doctor/documentation', {
    method: 'POST',
    body: JSON.stringify(templateNoteData)
  });

  logTest('POST documentation with template', templateStatus === 200);
}

/**
 * Test error handling and security
 */
async function testErrorHandling() {
  console.log('\n🔒 Testing Error Handling & Security...');
  
  // Test unauthorized access (no auth token)
  const originalToken = global.authToken;
  global.authToken = '';
  
  const { status: unauthStatus } = await makeRequest('/api/doctor/patients');
  logTest('Unauthorized access prevention', unauthStatus === 401);
  
  global.authToken = originalToken;

  // Test invalid data
  const { status: invalidStatus } = await makeRequest('/api/doctor/prescriptions', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' })
  });
  logTest('Invalid data handling', invalidStatus === 400);

  // Test SQL injection prevention
  const { status: sqlStatus } = await makeRequest("/api/doctor/patients?search=' OR 1=1 --");
  logTest('SQL injection prevention', sqlStatus !== 500);
}

/**
 * Performance tests
 */
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const start = Date.now();
  const promises = [];
  
  // Make 5 concurrent requests
  for (let i = 0; i < 5; i++) {
    promises.push(makeRequest('/api/doctor/patients?limit=5'));
  }
  
  await Promise.all(promises);
  const duration = Date.now() - start;
  
  logTest('Concurrent requests handling', duration < 5000, `Duration: ${duration}ms`);
  logTest('Response time acceptable', duration < 2000, `Duration: ${duration}ms`);
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    if (TEST_CONFIG.testPatientId) {
      // Clean up test prescriptions
      await prisma.prescription.deleteMany({
        where: { patientId: TEST_CONFIG.testPatientId }
      });
      
      // Clean up test clinical notes
      await prisma.clinicalNote.deleteMany({
        where: { patientId: TEST_CONFIG.testPatientId }
      });
      
      // Clean up test care actions
      await prisma.careAction.deleteMany({
        where: { patientId: TEST_CONFIG.testPatientId }
      });
    }
    
    logTest('Cleanup completed', true);
  } catch (error) {
    logTest('Cleanup completed', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Doctor Dashboard API Tests\n');
  console.log(`Testing against: ${API_BASE_URL}`);
  console.log(`Doctor account: ${TEST_CONFIG.doctor.email}\n`);

  try {
    // Authentication
    const authenticated = await authenticate();
    if (!authenticated) {
      console.log('\n❌ Authentication failed. Cannot proceed with tests.');
      return;
    }

    // Setup
    const setupComplete = await setupTestData();
    if (!setupComplete) {
      console.log('\n❌ Test data setup failed. Cannot proceed with tests.');
      return;
    }

    // Run API tests
    await testPatientsEndpoint();
    await testAppointmentsEndpoint();
    await testPrescriptionsEndpoint();
    await testAIAssistantEndpoint();
    await testAnalyticsEndpoint();
    await testDocumentationEndpoint();

    // Security and error handling
    await testErrorHandling();
    await testPerformance();

    // Cleanup
    await cleanup();

  } catch (error) {
    console.error('\n💥 Test runner failed:', error);
    logTest('Test runner execution', false, error.message);
  } finally {
    await prisma.$disconnect();
  }

  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`  - ${test.name}: ${test.details}`));
  }

  console.log('\n✨ Doctor Dashboard API testing completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };

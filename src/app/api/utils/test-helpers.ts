'use server';

import prisma from '@/lib/prisma';

// Function to seed a test clinic if one doesn't exist
export async function seedTestClinic() {
  try {
    // Check if test clinic exists
    const existingClinic = await prisma.clinic.findFirst({
      where: { name: 'Test Clinic' }
    });
    
    if (existingClinic) {
      return {
        success: true,
        message: 'Test clinic already exists',
        clinicId: existingClinic.id
      };
    }
    
    // Create a test clinic
    const newClinic = await prisma.clinic.create({
      data: {
        name: 'Test Clinic',
        address: '123 Test Street, Test City, 12345'
      }
    });
    
    return {
      success: true,
      message: 'Test clinic created successfully',
      clinicId: newClinic.id
    };
  } catch (error) {    console.error('Error seeding test clinic:', error);
    return {
      success: false,
      message: `Error creating test clinic: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Function to get the test clinic ID
export async function getTestClinicId() {
  try {
    const clinic = await prisma.clinic.findFirst({
      where: { name: 'Test Clinic' }
    });
    
    return clinic?.id || null;
  } catch (error) {
    console.error('Error getting test clinic:', error);
    return null;
  }
}

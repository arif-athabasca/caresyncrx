const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function createTestTriageAssignment() {
  try {
    // Get a provider
    const provider = await prisma.user.findFirst({
      where: { role: 'DOCTOR' },
      select: { id: true, email: true }
    });
    
    if (!provider) {
      console.log('No doctor found');
      return;
    }
    
    // Get a patient
    const patient = await prisma.patient.findFirst({
      select: { id: true, firstName: true, lastName: true }
    });
    
    if (!patient) {
      console.log('No patient found');
      return;
    }
    
    // Create a triage case assigned to the provider
    const triage = await prisma.patientTriage.create({
      data: {
        id: randomUUID(),
        patientId: patient.id,
        symptoms: 'Test symptoms for schedule button testing',
        urgencyLevel: 'MEDIUM',
        status: 'ASSIGNED',
        assignedToId: provider.id,
        assignmentReason: 'Test assignment for schedule button',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Created test triage assignment:');
    console.log('- Patient: ' + patient.firstName + ' ' + patient.lastName);
    console.log('- Assigned to: ' + provider.email);
    console.log('- Triage ID: ' + triage.id);
    console.log('- Status: ' + triage.status);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTriageAssignment();

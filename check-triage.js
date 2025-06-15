const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTriageAssignments() {
  try {
    const assignedTriages = await prisma.patientTriage.findMany({
      where: { 
        status: 'ASSIGNED',
        assignedToId: { not: null }
      },
      include: {
        Patient: { select: { firstName: true, lastName: true } },
        User_PatientTriage_assignedToIdToUser: { select: { email: true, role: true } }
      },
      take: 5
    });
    
    console.log('Assigned Triage Cases:');
    assignedTriages.forEach(triage => {
      console.log('- Patient: ' + triage.Patient.firstName + ' ' + triage.Patient.lastName);
      console.log('  Assigned to: ' + triage.User_PatientTriage_assignedToIdToUser.email);
      console.log('  Urgency: ' + triage.urgencyLevel);
      console.log('  Status: ' + triage.status);
      console.log('');
    });
    
    console.log('Total assigned triages: ' + assignedTriages.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTriageAssignments();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTriageAssignment() {
  try {
    // Get the correct doctor who has schedule slots
    const doctorWithSlots = await prisma.user.findFirst({
      where: { 
        email: 'dr.james.thompson@caresync.com',
        role: 'DOCTOR'
      },
      select: { id: true, email: true }
    });
    
    if (!doctorWithSlots) {
      console.log('Doctor with slots not found');
      return;
    }
    
    // Update the existing triage assignment
    const updatedTriage = await prisma.patientTriage.updateMany({
      where: { 
        status: 'ASSIGNED',
        assignedToId: { not: null }
      },
      data: {
        assignedToId: doctorWithSlots.id,
        assignmentReason: 'Updated assignment for testing - doctor with schedule slots'
      }
    });
    
    console.log('Updated triage assignments to use doctor with schedule slots:');
    console.log('- Doctor: ' + doctorWithSlots.email);
    console.log('- Updated triages count: ' + updatedTriage.count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTriageAssignment();

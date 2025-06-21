const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  try {
    console.log('🔍 Verifying seeded data...\n');
    
    // Check clinic
    const clinics = await prisma.clinic.findMany();
    console.log(`🏥 Clinics: ${clinics.length}`);
    clinics.forEach(clinic => {
      console.log(`   - ${clinic.name} (ID: ${clinic.id})`);
    });

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        clinicId: true
      }
    });
    console.log(`\n👥 Users: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.role}: ${user.firstName} ${user.lastName} (${user.email})`);
    });

    // Check patients
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        healthCardNumber: true,
        governmentVerified: true,
        clinicId: true
      }
    });
    console.log(`\n🏥 Patients: ${patients.length}`);
    patients.forEach(patient => {
      console.log(`   - ${patient.firstName} ${patient.lastName} (${patient.email}) - Health Card: ${patient.healthCardNumber}, Verified: ${patient.governmentVerified}`);
    });

    // Check patient consent
    const consents = await prisma.patientConsent.findMany();
    console.log(`\n📋 Patient Consents: ${consents.length}`);

    // Check schedule slots
    const scheduleSlots = await prisma.scheduleSlot.findMany({
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });
    console.log(`\n📅 Schedule Slots: ${scheduleSlots.length}`);
    scheduleSlots.forEach(slot => {
      console.log(`   - ${slot.startTime.toLocaleString()} - ${slot.User.firstName} ${slot.User.lastName} (${slot.User.role}) - ${slot.appointmentType} - ${slot.status}`);
    });

    // Check audit logs
    const auditLogs = await prisma.auditLog.findMany();
    console.log(`\n📊 Audit Logs: ${auditLogs.length}`);

    console.log('\n✅ Data verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMockPatients() {
  try {
    console.log('🏥 Creating mock patients for triage system...');
    
    const mockPatients = [
      { id: 'cmbsuhsf700xjtqrsws6qhxph', firstName: 'John', lastName: 'Smith', dateOfBirth: '1985-03-15' },
      { id: 'cmbsuhsfb00xltqrslgk97isj', firstName: 'Maria', lastName: 'Garcia', dateOfBirth: '1978-07-22' },
      { id: 'cmbsuhsfc00xntqrs5buq7wrq', firstName: 'Robert', lastName: 'Johnson', dateOfBirth: '1963-11-08' },
      { id: 'cmbsuhsfc00xptqrsqzsd8x8n', firstName: 'Jennifer', lastName: 'Davis', dateOfBirth: '1990-05-30' },
      { id: 'cmbsuhsfd00xrtqrs06q3mjmg', firstName: 'Michael', lastName: 'Wilson', dateOfBirth: '1972-09-12' }
    ];
    
    // First check what clinics exist
    const clinics = await prisma.clinic.findMany({
      select: { id: true, name: true }
    });
    
    if (clinics.length === 0) {
      console.log('⚠️ No clinics found. Creating a test clinic first...');
      const testClinic = await prisma.clinic.create({
        data: {
          id: 'test-clinic-id',
          name: 'CareSyncRx Test Clinic',
          address: '123 Healthcare Ave',
          phone: '555-123-4567',
          email: 'clinic@caresyncrx.com'
        }
      });
      console.log('✅ Created test clinic:', testClinic.id);
    }
    
    const clinicId = clinics.length > 0 ? clinics[0].id : 'test-clinic-id';
    console.log(`📍 Using clinic: ${clinicId}`);
    
    let created = 0;
    let skipped = 0;
    
    for (const patient of mockPatients) {
      try {
        // Check if patient already exists
        const existing = await prisma.patient.findUnique({
          where: { id: patient.id }
        });
        
        if (existing) {
          console.log(`⏭️ Patient ${patient.firstName} ${patient.lastName} already exists`);
          skipped++;
          continue;
        }        await prisma.patient.create({
          data: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: new Date(patient.dateOfBirth),
            language: 'en',
            clinicId: clinicId
          }
        });
        
        console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);
        created++;
        
      } catch (error) {
        console.error(`❌ Error creating patient ${patient.firstName} ${patient.lastName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Patient creation complete!`);
    console.log(`   ✅ Created: ${created} patients`);
    console.log(`   ⏭️ Skipped: ${skipped} existing patients`);
    
    // Verify patients were created
    const totalPatients = await prisma.patient.count();
    console.log(`📊 Total patients in database: ${totalPatients}`);
    
  } catch (error) {
    console.error('❌ Error creating mock patients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMockPatients();

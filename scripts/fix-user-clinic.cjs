/**
 * Script to fix the user's clinic ID so they can access providers
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserClinicId() {
  try {
    console.log('🔍 Checking current user clinic data...');
    
    // Find all users and their clinic IDs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clinicId: true,
        role: true
      }
    });
    
    console.log('📋 Current users:');
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}): clinicId="${user.clinicId}", role=${user.role}`);
    });
    
    // Find all clinics
    const clinics = await prisma.clinic.findMany();
    console.log('\n🏥 Available clinics:');
    clinics.forEach(clinic => {
      console.log(`  - ${clinic.id}: ${clinic.name} (${clinic.address})`);
    });
    
    // Find all providers (users who could handle triage)
    const providers = await prisma.user.findMany({
      where: {
        role: {
          in: ['DOCTOR', 'NURSE', 'PHARMACIST']
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clinicId: true,
        role: true
      }
    });
    
    console.log('\n👨‍⚕️ Available providers:');
    providers.forEach(provider => {
      console.log(`  - ${provider.firstName} ${provider.lastName} (${provider.role}): clinicId="${provider.clinicId}"`);
    });
    
    // Find users with empty or invalid clinic IDs
    const usersNeedingFix = users.filter(user => !user.clinicId || user.clinicId === '');
    
    if (usersNeedingFix.length > 0) {
      console.log('\n⚠️  Users needing clinic ID fix:');
      usersNeedingFix.forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email}): "${user.clinicId}"`);
      });
      
      // Update users to use the clinic that has providers
      const targetClinicId = 'clinic_sample_001'; // Based on the providers script output
      
      for (const user of usersNeedingFix) {
        await prisma.user.update({
          where: { id: user.id },
          data: { clinicId: targetClinicId }
        });
        console.log(`✅ Updated ${user.firstName} ${user.lastName} to use clinicId: ${targetClinicId}`);
      }
    } else {
      console.log('\n✅ All users have valid clinic IDs');
    }
    
    console.log('\n🎉 Clinic ID fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing user clinic IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserClinicId();

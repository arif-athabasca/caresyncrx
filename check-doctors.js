const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProviders() {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      select: { id: true, email: true, role: true }
    });
    
    console.log('All doctors:');
    doctors.forEach(doc => {
      console.log('- ' + doc.email + ' (' + doc.id + ')');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProviders();

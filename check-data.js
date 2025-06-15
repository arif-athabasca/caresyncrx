const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Check schedule slots
    const slots = await prisma.scheduleSlot.findMany({
      take: 5,
      include: {
        User: { select: { email: true, role: true } },
        Patient: { select: { firstName: true, lastName: true } }
      },
      orderBy: { startTime: 'desc' }
    });
    
    console.log('Recent Schedule Slots:');
    slots.forEach(slot => {
      console.log('- ' + slot.id + ': ' + slot.User.email + ' at ' + slot.startTime + ' (' + slot.status + ')');
    });
    
    // Check providers
    const providers = await prisma.user.findMany({
      where: { role: { in: ['DOCTOR', 'NURSE', 'PHARMACIST'] } },
      take: 5,
      select: { id: true, email: true, role: true }
    });
    
    console.log('\nProviders:');
    providers.forEach(p => {
      console.log('- ' + p.email + ' (' + p.role + ')');
    });

    // Check for today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySlots = await prisma.scheduleSlot.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        User: { select: { email: true } }
      }
    });
    
    console.log('\nToday\'s slots (' + today.toDateString() + '): ' + todaySlots.length);
    todaySlots.forEach(slot => {
      console.log('- ' + slot.User.email + ': ' + slot.startTime.toLocaleTimeString() + ' (' + slot.status + ')');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

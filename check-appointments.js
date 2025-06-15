const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  try {
    // Get today in the correct format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('Checking slots for today:', today.toDateString());
    
    const slots = await prisma.scheduleSlot.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        User: { select: { email: true } }
      },
      orderBy: { startTime: 'asc' }
    });
    
    console.log('Total slots found:', slots.length);
    
    // Group by provider and status
    const providers = {};
    slots.forEach(slot => {
      const email = slot.User.email;
      if (!providers[email]) {
        providers[email] = { AVAILABLE: 0, BOOKED: 0, total: 0 };
      }
      providers[email][slot.status] = (providers[email][slot.status] || 0) + 1;
      providers[email].total++;
    });
    
    console.log('\nSlots by provider:');
    Object.entries(providers).forEach(([email, stats]) => {
      console.log(`${email}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Available: ${stats.AVAILABLE}`);
      console.log(`  Booked: ${stats.BOOKED}`);
    });
    
    // Test the date filtering logic like the frontend uses
    console.log('\n--- Testing Frontend Date Logic ---');
    const selectedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('Selected date string:', selectedDate);
    
    slots.forEach(slot => {
      const slotDate = new Date(slot.startTime);
      const selectedDateObj = new Date(selectedDate);
      
      const matches = (
        slotDate.getFullYear() === selectedDateObj.getFullYear() &&
        slotDate.getMonth() === selectedDateObj.getMonth() &&
        slotDate.getDate() === selectedDateObj.getDate()
      );
      
      console.log(`Slot ${slot.id}: ${slot.startTime} -> matches: ${matches}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlots();

// Add sample schedule slots for today
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTodaysSchedules() {
  try {
    console.log('📅 Adding schedule slots for today...');
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Date:', today);
    
    // Get some providers
    const providers = await prisma.user.findMany({
      where: {
        role: { in: ['DOCTOR', 'NURSE', 'PHARMACIST'] },
        clinicId: 'clinic_sample_001'
      },
      take: 5
    });
    
    console.log(`Found ${providers.length} providers to schedule`);
    
    const scheduleSlots = [];
    
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      
      // Create 3-4 time slots for each provider today
      const timeSlots = [
        { hour: 9, status: 'AVAILABLE' },
        { hour: 11, status: 'AVAILABLE' }, 
        { hour: 14, status: 'BOOKED' },
        { hour: 16, status: 'AVAILABLE' }
      ];
      
      for (const timeSlot of timeSlots) {
        const startTime = new Date(`${today}T${timeSlot.hour.toString().padStart(2, '0')}:00:00.000Z`);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
          scheduleSlots.push({
          id: `${provider.id}-${today}-${timeSlot.hour}`,
          providerId: provider.id,
          startTime: startTime,
          endTime: endTime,
          appointmentType: 'CONSULTATION',
          status: timeSlot.status,
          description: timeSlot.status === 'BOOKED' ? 'Patient consultation' : 'Available for booking',
          location: 'Room ' + (i + 1),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log(`Creating ${scheduleSlots.length} schedule slots...`);
    
    // Delete existing slots for today first
    await prisma.scheduleSlot.deleteMany({
      where: {
        startTime: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      }
    });
    
    // Create new slots
    await prisma.scheduleSlot.createMany({
      data: scheduleSlots,
      skipDuplicates: true
    });
    
    console.log('✅ Successfully created schedule slots for today!');
    
    // Verify creation
    const todaysSlots = await prisma.scheduleSlot.findMany({
      where: {
        startTime: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`)
        }
      },
      include: {
        User: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });
    
    console.log(`\n📊 Created ${todaysSlots.length} slots for today:`);
    todaysSlots.forEach((slot, index) => {
      console.log(`${index + 1}. ${slot.User.email} - ${new Date(slot.startTime).toLocaleTimeString()} (${slot.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error creating schedule slots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTodaysSchedules();

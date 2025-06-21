/**
 * Seed Script - Create Sample Data for CareSyncRx
 * Creates clinic, users with different roles, and sample patients
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    await prisma.auditLog.deleteMany({});
    await prisma.patientConsent.deleteMany({});
    await prisma.scheduleSlot.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.clinic.deleteMany({});
    console.log('✅ Cleared existing data');
    
    // 1. Create a clinic first
    console.log('📍 Creating clinic...');
    const clinic = await prisma.clinic.create({
      data: {
        id: uuidv4(),
        name: 'CareSyncRx Health Center',
        address: '123 Healthcare Ave, Toronto, ON M5V 2A8',
      }
    });
    console.log(`✅ Created clinic: ${clinic.name} (ID: ${clinic.id})`);

    // 2. Create users with different roles
    console.log('👥 Creating users with different roles...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
      // Admin User
    const adminUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: 'admin@caresyncrx.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'ADMIN',
        clinicId: clinic.id,
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }
    });
    console.log(`✅ Created ADMIN: ${adminUser.firstName} ${adminUser.lastName}`);

    // Doctor User
    const doctorUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: 'doctor@caresyncrx.com',
        password: hashedPassword,
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        role: 'DOCTOR',
        clinicId: clinic.id,
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }
    });
    console.log(`✅ Created DOCTOR: ${doctorUser.firstName} ${doctorUser.lastName}`);

    // Nurse User
    const nurseUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: 'nurse@caresyncrx.com',
        password: hashedPassword,
        firstName: 'Jennifer',
        lastName: 'Martinez',
        role: 'NURSE',
        clinicId: clinic.id,
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }
    });
    console.log(`✅ Created NURSE: ${nurseUser.firstName} ${nurseUser.lastName}`);

    // Pharmacist User
    const pharmacistUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: 'pharmacist@caresyncrx.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Kim',
        role: 'PHARMACIST',
        clinicId: clinic.id,
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }
    });
    console.log(`✅ Created PHARMACIST: ${pharmacistUser.firstName} ${pharmacistUser.lastName}`);// Lab Technician User
    const labTechUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: 'labtech@caresyncrx.com',
        password: hashedPassword,
        firstName: 'Lisa',
        lastName: 'Thompson',
        role: 'TECHNICIAN',
        clinicId: clinic.id,
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }
    });
    console.log(`✅ Created TECHNICIAN: ${labTechUser.firstName} ${labTechUser.lastName}`);

    // 3. Create sample patients
    console.log('🏥 Creating sample patients...');
    
    const patients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1-416-555-1001',
        gender: 'Male',
        dateOfBirth: new Date('1985-06-15'),
        healthCardNumber: 'ON12345678',
        healthCardProvince: 'ON',
        healthCardExpiry: new Date('2026-12-31'),
        governmentVerified: true,
        address: '456 Patient St, Toronto, ON M4B 1X8',
        language: 'English',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        phone: '+1-416-555-1002',
        gender: 'Female',
        dateOfBirth: new Date('1990-03-22'),
        healthCardNumber: 'ON87654321',
        healthCardProvince: 'ON',
        healthCardExpiry: new Date('2027-06-30'),
        governmentVerified: true,
        address: '789 Wellness Ave, Toronto, ON M5R 2K3',
        language: 'English',
      },
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@email.com',
        phone: '+1-416-555-1003',
        gender: 'Female',
        dateOfBirth: new Date('1978-11-08'),
        healthCardNumber: 'ON11223344',
        healthCardProvince: 'ON',
        healthCardExpiry: new Date('2025-12-31'),
        governmentVerified: false,
        address: '321 Care Blvd, Toronto, ON M6H 1Y9',
        language: 'Spanish',
      },
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@email.com',
        phone: '+1-416-555-1004',
        gender: 'Male',
        dateOfBirth: new Date('1965-09-14'),
        healthCardNumber: 'ON55667788',
        healthCardProvince: 'ON',
        healthCardExpiry: new Date('2026-03-31'),
        governmentVerified: true,
        address: '654 Health St, Toronto, ON M3A 1B7',
        language: 'English',
      },
      {
        firstName: 'Emily',
        lastName: 'Brown',
        email: 'emily.brown@email.com',
        phone: '+1-416-555-1005',
        gender: 'Female',
        dateOfBirth: new Date('1995-12-03'),
        healthCardNumber: 'ON99887766',
        healthCardProvince: 'ON',
        healthCardExpiry: new Date('2027-09-30'),
        governmentVerified: true,
        address: '987 Medical Way, Toronto, ON M8V 3L5',
        language: 'English',
      }
    ];

    for (const patientData of patients) {
      const patient = await prisma.patient.create({
        data: {
          id: uuidv4(),
          ...patientData,
          clinicId: clinic.id,
          lastGovSync: patientData.governmentVerified ? new Date() : null,
        }
      });      // Create PIPEDA consent for each patient
      await prisma.patientConsent.create({
        data: {
          id: uuidv4(),
          patientId: patient.id,
          consentMethod: 'ELECTRONIC',
          basicCare: true,
          aiAnalysis: Math.random() > 0.5,
          aiDiagnostics: Math.random() > 0.5,
          aiMedication: Math.random() > 0.5,
          aiTriage: Math.random() > 0.4,
          dataSharing: Math.random() > 0.3,
          research: Math.random() > 0.5,
          administrative: true,
          doctorAIAssistant: Math.random() > 0.4,
          ipAddress: '192.168.1.100',
          deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      // Create audit log for patient registration
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          patientId: patient.id,
          userId: adminUser.id,
          action: 'PATIENT_REGISTERED',
          details: {
            method: 'seed_script',
            healthCardNumber: patient.healthCardNumber?.slice(-4),
            province: patient.healthCardProvince,
            governmentVerified: patient.governmentVerified,
          },
          ip_address: '192.168.1.100',
          user_agent: 'Seed Script',
        }
      });

      console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName} (Health Card: ${patient.healthCardNumber})`);
    }

    // 4. Create some sample schedules for the doctor
    console.log('📅 Creating sample schedule slots...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduleSlots = [
      {
        providerId: doctorUser.id,
        patientId: null, // Available slot
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 30),
        status: 'AVAILABLE',
        appointmentType: 'CONSULTATION',
      },
      {
        providerId: doctorUser.id,
        patientId: null,
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 30),
        status: 'AVAILABLE',
        appointmentType: 'FOLLOW_UP',
      },
      {
        providerId: doctorUser.id,
        patientId: null,
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 30),
        status: 'AVAILABLE',
        appointmentType: 'CONSULTATION',
      },
    ];

    for (const slotData of scheduleSlots) {
      const slot = await prisma.scheduleSlot.create({
        data: {
          id: uuidv4(),
          ...slotData,
        }
      });
      console.log(`✅ Created schedule slot: ${slot.startTime.toDateString()} ${slot.startTime.toTimeString().slice(0,5)}-${slot.endTime.toTimeString().slice(0,5)}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Clinic: 1 (${clinic.name})`);
    console.log(`   Users: 5 (Admin, Doctor, Nurse, Pharmacist, Lab Tech)`);
    console.log(`   Patients: ${patients.length} (with PIPEDA consent)`);
    console.log(`   Schedule Slots: ${scheduleSlots.length}`);
    console.log('\n🔑 Login Credentials (password: password123):');
    console.log('   Admin: admin@caresyncrx.com');
    console.log('   Doctor: doctor@caresyncrx.com');
    console.log('   Nurse: nurse@caresyncrx.com');
    console.log('   Pharmacist: pharmacist@caresyncrx.com');
    console.log('   Lab Tech: labtech@caresyncrx.com');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
createSampleData()
  .then(() => {
    console.log('✅ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  });

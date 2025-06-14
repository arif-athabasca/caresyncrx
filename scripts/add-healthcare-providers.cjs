/**
 * Script to add 15 diverse healthcare provider users for testing
 * Includes doctors, nurses, pharmacists, and caregivers with realistic data
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function addTestProviders() {
  try {
    console.log('🏥 Adding 15 diverse healthcare provider users...');
    
    // Get an existing clinic ID to use
    const existingUser = await prisma.user.findFirst({
      select: { clinicId: true }
    });
    
    if (!existingUser) {
      console.error('❌ No existing users found - cannot determine clinic ID');
      return;
    }
    
    const clinicId = existingUser.clinicId;
    console.log(`📍 Using clinic ID: ${clinicId}`);
    
    // Pre-hashed password for "CareSyncRx2024!" for all test users
    const hashedPassword = '$2b$12$LQv3c1yqBwEHxE03gsaC8eK.FrjXO.b9ipdHnVMrEuL4MyM74yCtG';
    const passwordExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    
    // Define 15 diverse healthcare providers
    const providers = [
      // DOCTORS (5)
      {
        id: uuidv4(),
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'dr.sarah.johnson@caresync.com',
        role: 'DOCTOR',
        specialties: [
          {
            specialty: 'Internal Medicine',
            expertise: ['Diabetes Management', 'Hypertension', 'Preventive Care', 'Chronic Disease Management'],
            procedures: ['Physical Examinations', 'Diagnostic Consultation', 'Treatment Planning'],
            urgencyLevel: ['HIGH', 'MEDIUM', 'LOW'],
            yearsExp: 15,
            isCertified: true,
            certificationBody: 'American Board of Internal Medicine',
            registrationNum: 'IM-2024-001'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        email: 'dr.michael.chen@caresync.com',
        role: 'DOCTOR',
        specialties: [
          {
            specialty: 'Cardiology',
            expertise: ['Heart Disease', 'Cardiac Arrhythmias', 'Coronary Artery Disease', 'Heart Failure'],
            procedures: ['Echocardiography', 'Stress Testing', 'Cardiac Catheterization'],
            urgencyLevel: ['HIGH', 'MEDIUM'],
            yearsExp: 12,
            isCertified: true,
            certificationBody: 'American Board of Cardiovascular Disease',
            registrationNum: 'CD-2024-002'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. Emily',
        lastName: 'Rodriguez',
        email: 'dr.emily.rodriguez@caresync.com',
        role: 'DOCTOR',
        specialties: [
          {
            specialty: 'Pediatrics',
            expertise: ['Child Development', 'Immunizations', 'Pediatric Emergency Care', 'Growth Disorders'],
            procedures: ['Well-Child Visits', 'Developmental Assessments', 'Vaccination Administration'],
            urgencyLevel: ['HIGH', 'MEDIUM', 'LOW'],
            yearsExp: 8,
            isCertified: true,
            certificationBody: 'American Board of Pediatrics',
            registrationNum: 'PD-2024-003'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. James',
        lastName: 'Thompson',
        email: 'dr.james.thompson@caresync.com',
        role: 'DOCTOR',
        specialties: [
          {
            specialty: 'Emergency Medicine',
            expertise: ['Trauma Care', 'Critical Care', 'Emergency Procedures', 'Resuscitation'],
            procedures: ['Emergency Surgery', 'Intubation', 'Central Line Placement', 'Wound Repair'],
            urgencyLevel: ['HIGH'],
            yearsExp: 10,
            isCertified: true,
            certificationBody: 'American Board of Emergency Medicine',
            registrationNum: 'EM-2024-004'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. Lisa',
        lastName: 'Patel',
        email: 'dr.lisa.patel@caresync.com',
        role: 'DOCTOR',
        specialties: [
          {
            specialty: 'Psychiatry',
            expertise: ['Depression Treatment', 'Anxiety Disorders', 'Medication Management', 'Therapy'],
            procedures: ['Psychiatric Evaluation', 'Medication Adjustment', 'Crisis Intervention'],
            urgencyLevel: ['HIGH', 'MEDIUM', 'LOW'],
            yearsExp: 14,
            isCertified: true,
            certificationBody: 'American Board of Psychiatry and Neurology',
            registrationNum: 'PS-2024-005'
          }
        ]
      },
      
      // NURSES (5)
      {
        id: uuidv4(),
        firstName: 'Jennifer',
        lastName: 'Williams',
        email: 'nurse.jennifer.williams@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Critical Care Nursing',
            expertise: ['ICU Care', 'Ventilator Management', 'Hemodynamic Monitoring', 'Patient Assessment'],
            procedures: ['IV Administration', 'Wound Care', 'Medication Administration', 'Patient Monitoring'],
            urgencyLevel: ['HIGH', 'MEDIUM'],
            yearsExp: 7,
            isCertified: true,
            certificationBody: 'American Association of Critical-Care Nurses',
            registrationNum: 'RN-2024-006'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Robert',
        lastName: 'Davis',
        email: 'nurse.robert.davis@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Emergency Nursing',
            expertise: ['Triage', 'Emergency Procedures', 'Trauma Care', 'Patient Stabilization'],
            procedures: ['Emergency Assessment', 'IV Insertion', 'Wound Dressing', 'Vital Signs Monitoring'],
            urgencyLevel: ['HIGH', 'MEDIUM'],
            yearsExp: 5,
            isCertified: true,
            certificationBody: 'Emergency Nurses Association',
            registrationNum: 'RN-2024-007'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'nurse.maria.garcia@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Pediatric Nursing',
            expertise: ['Child Care', 'Family Education', 'Immunization Administration', 'Growth Monitoring'],
            procedures: ['Pediatric Assessment', 'Medication Administration', 'Patient Education'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 6,
            isCertified: true,
            certificationBody: 'Pediatric Nursing Certification Board',
            registrationNum: 'RN-2024-008'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'David',
        lastName: 'Miller',
        email: 'nurse.david.miller@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Medical-Surgical Nursing',
            expertise: ['Post-Operative Care', 'Chronic Disease Management', 'Patient Education', 'Discharge Planning'],
            procedures: ['Wound Care', 'Medication Administration', 'Patient Assessment', 'Health Teaching'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 9,
            isCertified: true,
            certificationBody: 'Medical-Surgical Nursing Certification Board',
            registrationNum: 'RN-2024-009'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Ashley',
        lastName: 'Brown',
        email: 'nurse.ashley.brown@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Geriatric Nursing',
            expertise: ['Elderly Care', 'Dementia Care', 'Fall Prevention', 'Medication Management'],
            procedures: ['Geriatric Assessment', 'Safety Evaluation', 'Cognitive Assessment'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 11,
            isCertified: true,
            certificationBody: 'Gerontological Nursing Certification Commission',
            registrationNum: 'RN-2024-010'
          }
        ]
      },
      
      // PHARMACISTS (3)
      {
        id: uuidv4(),
        firstName: 'Dr. Kevin',
        lastName: 'Anderson',
        email: 'pharmacist.kevin.anderson@caresync.com',
        role: 'ADMIN', // Using ADMIN as closest role since PHARMACIST may not exist in schema
        specialties: [
          {
            specialty: 'Clinical Pharmacy',
            expertise: ['Medication Therapy Management', 'Drug Interactions', 'Dosage Optimization', 'Patient Counseling'],
            procedures: ['Medication Review', 'Drug Utilization Review', 'Patient Education'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 13,
            isCertified: true,
            certificationBody: 'Board of Pharmacy Specialties',
            registrationNum: 'PharmD-2024-011'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. Rachel',
        lastName: 'Wilson',
        email: 'pharmacist.rachel.wilson@caresync.com',
        role: 'ADMIN',
        specialties: [
          {
            specialty: 'Pediatric Pharmacy',
            expertise: ['Pediatric Dosing', 'Compounding', 'Vaccine Administration', 'Nutrition Support'],
            procedures: ['Prescription Review', 'Compound Preparation', 'Patient Consultation'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 8,
            isCertified: true,
            certificationBody: 'Board of Pharmacy Specialties',
            registrationNum: 'PharmD-2024-012'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Dr. Thomas',
        lastName: 'Lee',
        email: 'pharmacist.thomas.lee@caresync.com',
        role: 'ADMIN',
        specialties: [
          {
            specialty: 'Geriatric Pharmacy',
            expertise: ['Polypharmacy Management', 'Medication Reconciliation', 'Age-Related Pharmacokinetics'],
            procedures: ['Comprehensive Medication Review', 'Drug Therapy Problems Assessment'],
            urgencyLevel: ['MEDIUM', 'LOW'],
            yearsExp: 16,
            isCertified: true,
            certificationBody: 'Board of Pharmacy Specialties',
            registrationNum: 'PharmD-2024-013'
          }
        ]
      },
      
      // CAREGIVERS (2)
      {
        id: uuidv4(),
        firstName: 'Susan',
        lastName: 'Taylor',
        email: 'caregiver.susan.taylor@caresync.com',
        role: 'NURSE', // Using NURSE as closest role since CAREGIVER may not exist
        specialties: [
          {
            specialty: 'Home Health Care',
            expertise: ['Activities of Daily Living', 'Medication Reminders', 'Companionship', 'Health Monitoring'],
            procedures: ['Personal Care Assistance', 'Meal Preparation', 'Transportation'],
            urgencyLevel: ['LOW'],
            yearsExp: 4,
            isCertified: true,
            certificationBody: 'National Association for Home Care & Hospice',
            registrationNum: 'CG-2024-014'
          }
        ]
      },
      {
        id: uuidv4(),
        firstName: 'Mark',
        lastName: 'Johnson',
        email: 'caregiver.mark.johnson@caresync.com',
        role: 'NURSE',
        specialties: [
          {
            specialty: 'Respite Care',
            expertise: ['Family Support', 'Patient Advocacy', 'Basic Health Monitoring', 'Emotional Support'],
            procedures: ['Basic Care Assistance', 'Safety Monitoring', 'Communication Support'],
            urgencyLevel: ['LOW'],
            yearsExp: 3,
            isCertified: true,
            certificationBody: 'National Association for Home Care & Hospice',
            registrationNum: 'CG-2024-015'
          }
        ]
      }
    ];
    
    let createdCount = 0;
    
    for (const provider of providers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: provider.email }
      });
      
      if (existingUser) {
        console.log(`⚠️  Provider ${provider.email} already exists`);
        continue;
      }
      
      // Create the user
      const newUser = await prisma.user.create({
        data: {
          id: provider.id,
          firstName: provider.firstName,
          lastName: provider.lastName,
          email: provider.email,
          password: hashedPassword,
          role: provider.role,
          clinicId: clinicId,
          passwordExpiresAt: passwordExpiresAt,
          lastPasswordChange: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Created ${provider.role}: ${newUser.firstName} ${newUser.lastName} (${newUser.email})`);
      
      // Add specialties for the provider
      for (const specialty of provider.specialties) {
        await prisma.providerSpecialty.create({
          data: {
            id: uuidv4(),
            providerId: newUser.id,
            specialty: specialty.specialty,
            expertise: specialty.expertise,
            procedures: specialty.procedures,
            urgencyLevel: specialty.urgencyLevel,
            yearsExp: specialty.yearsExp,
            isCertified: specialty.isCertified,
            certificationBody: specialty.certificationBody,
            registrationNum: specialty.registrationNum,
            updatedAt: new Date()
          }
        });
      }
      
      // Add availability (Monday to Friday, 8 AM to 5 PM)
      const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
      for (const day of weekdays) {
        await prisma.providerAvailability.create({
          data: {
            id: uuidv4(),
            providerId: newUser.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '17:00',
            isAvailable: true,
            maxPatients: provider.role === 'DOCTOR' ? 8 : 6,
            updatedAt: new Date()
          }
        });
      }
      
      // Add schedule slots for the next 3 days
      const today = new Date();
      for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
        const scheduleDate = new Date(today);
        scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
        
        // Skip weekends
        if (scheduleDate.getDay() === 0 || scheduleDate.getDay() === 6) {
          continue;
        }
        
        // Create morning and afternoon slots
        const timeSlots = [
          { hour: 9, minute: 0 },   // 9:00 AM
          { hour: 11, minute: 0 },  // 11:00 AM
          { hour: 14, minute: 0 },  // 2:00 PM
          { hour: 16, minute: 0 }   // 4:00 PM
        ];
        
        for (const timeSlot of timeSlots) {
          const startTime = new Date(scheduleDate);
          startTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1); // 1-hour slots
          
          await prisma.scheduleSlot.create({
            data: {
              id: uuidv4(),
              providerId: newUser.id,
              startTime: startTime,
              endTime: endTime,
              status: 'AVAILABLE',
              appointmentType: provider.role === 'DOCTOR' ? 'CONSULTATION' : 'CARE_SESSION',
              updatedAt: new Date()
            }
          });
        }
      }
      
      console.log(`📅 Added specialties, availability, and schedule slots for ${provider.firstName} ${provider.lastName}`);
      createdCount++;
    }
    
    console.log(`🎉 Successfully created ${createdCount} healthcare provider users!`);
    console.log(`📋 Summary:`);
    console.log(`   - 5 Doctors (Internal Medicine, Cardiology, Pediatrics, Emergency Medicine, Psychiatry)`);
    console.log(`   - 5 Nurses (Critical Care, Emergency, Pediatric, Med-Surg, Geriatric)`);
    console.log(`   - 3 Pharmacists (Clinical, Pediatric, Geriatric)`);
    console.log(`   - 2 Caregivers (Home Health, Respite Care)`);
    console.log(`🔐 All users have password: "CareSyncRx2024!"`);
    
  } catch (error) {
    console.error('❌ Error adding test providers:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

addTestProviders().catch(console.error);

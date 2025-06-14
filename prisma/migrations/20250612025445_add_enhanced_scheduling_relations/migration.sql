-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "patientId" TEXT,
    "triageId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "appointmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWorkload" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalSlots" INTEGER NOT NULL DEFAULT 0,
    "bookedSlots" INTEGER NOT NULL DEFAULT 0,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "emergencySlots" INTEGER NOT NULL DEFAULT 0,
    "utilizationRate" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderWorkload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialtyExpertise" (
    "id" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "subSpecialty" TEXT,
    "conditions" TEXT[],
    "procedures" TEXT[],
    "urgencyLevel" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialtyExpertise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleSlot_providerId_idx" ON "ScheduleSlot"("providerId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_patientId_idx" ON "ScheduleSlot"("patientId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_triageId_idx" ON "ScheduleSlot"("triageId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_startTime_idx" ON "ScheduleSlot"("startTime");

-- CreateIndex
CREATE INDEX "ScheduleSlot_endTime_idx" ON "ScheduleSlot"("endTime");

-- CreateIndex
CREATE INDEX "ScheduleSlot_status_idx" ON "ScheduleSlot"("status");

-- CreateIndex
CREATE INDEX "ProviderWorkload_providerId_idx" ON "ProviderWorkload"("providerId");

-- CreateIndex
CREATE INDEX "ProviderWorkload_date_idx" ON "ProviderWorkload"("date");

-- CreateIndex
CREATE INDEX "ProviderWorkload_utilizationRate_idx" ON "ProviderWorkload"("utilizationRate");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWorkload_providerId_date_key" ON "ProviderWorkload"("providerId", "date");

-- CreateIndex
CREATE INDEX "SpecialtyExpertise_specialty_idx" ON "SpecialtyExpertise"("specialty");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyExpertise_specialty_subSpecialty_key" ON "SpecialtyExpertise"("specialty", "subSpecialty");

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "PatientTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorkload" ADD CONSTRAINT "ProviderWorkload_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `SpecialtyExpertise` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `BillingRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[healthCardNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `patientId` to the `CareAction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `CareAction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CareAction" DROP CONSTRAINT "CareAction_triageId_fkey";

-- AlterTable
ALTER TABLE "BillingRecord" ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "CareAction" ADD COLUMN     "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ALTER COLUMN "triageId" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "governmentVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "healthCardExpiry" DATE,
ADD COLUMN     "healthCardNumber" TEXT,
ADD COLUMN     "healthCardProvince" TEXT,
ADD COLUMN     "lastGovSync" TIMESTAMP(3),
ADD COLUMN     "medicalHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PatientTriage" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "doctorNotes" TEXT,
ADD COLUMN     "lastDoctorVisit" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProviderSpecialty" ADD COLUMN     "procedures" TEXT[],
ADD COLUMN     "urgencyLevel" TEXT[];

-- DropTable
DROP TABLE "SpecialtyExpertise";

-- CreateTable
CREATE TABLE "DoctorAIProfile" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "aiPreferences" JSONB,
    "confidenceThresholds" JSONB,
    "enabledServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastAIInteraction" TIMESTAMP(3),
    "totalAIInteractions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAIProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorInsights" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "insightType" TEXT NOT NULL,
    "aiService" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAIAnalysis" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "triageId" TEXT,
    "analysisType" TEXT NOT NULL,
    "aiService" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "inputHash" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "processingTime" INTEGER,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticAIResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "diagnosticType" TEXT NOT NULL,
    "aiService" TEXT NOT NULL,
    "findings" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "summary" TEXT NOT NULL,
    "recommendations" TEXT[],
    "sourceDataUrl" TEXT,
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticAIResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorAuthorization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "procedureCode" TEXT,
    "diagnosisCode" TEXT,
    "insuranceProviderId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "aiProcessingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "aiConfidence" DOUBLE PRECISION,
    "aiRecommendation" TEXT,
    "aiReasoning" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "clinicalData" JSONB NOT NULL,
    "supportingDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalNecessity" TEXT,
    "insuranceResponse" JSONB,
    "authorizationNumber" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "PriorAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorAuthAIAnalysis" (
    "id" TEXT NOT NULL,
    "priorAuthId" TEXT NOT NULL,
    "aiService" TEXT NOT NULL DEFAULT 'PRIOR_AUTH_AI',
    "extractedData" JSONB NOT NULL,
    "payerRequirements" JSONB NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "riskFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processingTime" INTEGER NOT NULL,
    "dataQuality" DOUBLE PRECISION NOT NULL,
    "improvementSuggestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriorAuthAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAIAnalysis" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "aiService" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "alerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alternativeMeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAICoding" (
    "id" TEXT NOT NULL,
    "noteId" TEXT,
    "patientId" TEXT,
    "doctorId" TEXT NOT NULL,
    "aiService" TEXT NOT NULL DEFAULT 'MEDICAL_CODING_AI',
    "icd10Codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cptCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hcpcsCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sourceText" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAICoding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleAIRecommendation" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "recommendation" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "aiService" TEXT NOT NULL DEFAULT 'APPOINTMENT_AI',
    "data" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "implementedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "basicCare" BOOLEAN NOT NULL DEFAULT true,
    "aiAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "aiDiagnostics" BOOLEAN NOT NULL DEFAULT false,
    "aiMedication" BOOLEAN NOT NULL DEFAULT false,
    "aiMentalHealth" BOOLEAN NOT NULL DEFAULT false,
    "aiTriage" BOOLEAN NOT NULL DEFAULT false,
    "dataSharing" BOOLEAN NOT NULL DEFAULT false,
    "research" BOOLEAN NOT NULL DEFAULT false,
    "administrative" BOOLEAN NOT NULL DEFAULT true,
    "doctorAIAssistant" BOOLEAN NOT NULL DEFAULT false,
    "radiologyAI" BOOLEAN NOT NULL DEFAULT false,
    "laboratoryAI" BOOLEAN NOT NULL DEFAULT false,
    "pharmacistAI" BOOLEAN NOT NULL DEFAULT false,
    "mentalHealthAI" BOOLEAN NOT NULL DEFAULT false,
    "priorAuthAI" BOOLEAN NOT NULL DEFAULT false,
    "medicalCodingAI" BOOLEAN NOT NULL DEFAULT false,
    "patientCommunicationAI" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "consentMethod" TEXT NOT NULL,
    "witnessedBy" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "consentGivenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentExpiresAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnBy" TEXT,
    "withdrawalReason" TEXT,
    "dataAccessRequested" TIMESTAMP(3),
    "dataCorrectionRequested" TIMESTAMP(3),
    "dataPortabilityRequested" TIMESTAMP(3),

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAuditLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedFields" TEXT[],
    "previousValues" JSONB,
    "newValues" JSONB,
    "changedBy" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL,
    "patientInitiated" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "legalBasis" TEXT NOT NULL,
    "dataController" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "dataCategory" TEXT NOT NULL,
    "retentionPeriodYears" INTEGER NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "disposalMethod" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applicableLaws" TEXT[],
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDisposalRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "dataCategory" TEXT NOT NULL,
    "disposalReason" TEXT NOT NULL,
    "disposalMethod" TEXT NOT NULL,
    "recordsAffected" INTEGER NOT NULL,
    "dataIdentifiers" TEXT[],
    "disposalHash" TEXT NOT NULL,
    "disposedBy" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataDisposalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDataProcessingLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "aiService" TEXT NOT NULL,
    "processingPurpose" TEXT NOT NULL,
    "dataCategories" TEXT[],
    "consentVerified" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "missingConsents" TEXT[],
    "dataMinimized" BOOLEAN NOT NULL,
    "dataFields" TEXT[],
    "dataRetentionDays" INTEGER NOT NULL,
    "processingSuccessful" BOOLEAN NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "resultsRetained" BOOLEAN NOT NULL,
    "resultsShared" BOOLEAN NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "dataController" TEXT NOT NULL,
    "dataProcessor" TEXT NOT NULL,
    "transferMechanism" TEXT,
    "processedBy" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDataProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRightsRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specificData" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "assignedTo" TEXT,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "responseProvided" BOOLEAN NOT NULL DEFAULT false,
    "responseMethod" TEXT,
    "responseDetails" TEXT,
    "denialReason" TEXT,
    "denialLegalBasis" TEXT,
    "appealRights" TEXT,
    "verificationMethod" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "processingFee" DOUBLE PRECISION,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PatientRightsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "lastFourDigits" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "cardholderName" TEXT,
    "bankName" TEXT,
    "accountType" TEXT,
    "routingNumber" TEXT,
    "walletId" TEXT,
    "walletProvider" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "tokenizedData" TEXT,
    "fingerprint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingProvince" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT NOT NULL DEFAULT 'CA',
    "addedBy" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentProcessor" TEXT,
    "processorTransactionId" TEXT,
    "processorResponse" JSONB,
    "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientAmount" DOUBLE PRECISION NOT NULL,
    "copayAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductibleAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coinsuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "receiptNumber" TEXT,
    "authorizationCode" TEXT,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundedBy" TEXT,
    "processedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "riskScore" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "internalClaimId" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "billedAmount" DOUBLE PRECISION NOT NULL,
    "allowedAmount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientResponsibility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "statusReason" TEXT,
    "denialReason" TEXT,
    "denialCode" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceProvider" TEXT NOT NULL,
    "serviceCodes" TEXT[],
    "diagnosisCodes" TEXT[],
    "placeOfService" TEXT NOT NULL,
    "priorAuthRequired" BOOLEAN NOT NULL DEFAULT false,
    "priorAuthNumber" TEXT,
    "priorAuthStatus" TEXT,
    "appealCount" INTEGER NOT NULL DEFAULT 0,
    "lastAppealDate" TIMESTAMP(3),
    "appealStatus" TEXT,
    "submittedBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextPaymentDate" TIMESTAMP(3) NOT NULL,
    "finalPaymentDate" TIMESTAMP(3) NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodId" TEXT,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementSignedAt" TIMESTAMP(3),
    "agreementSignedBy" TEXT,
    "agreementDocument" TEXT,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "lastReminderSent" TIMESTAMP(3),
    "overdueNoticeSent" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlanInstallment" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "paymentId" TEXT,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlanInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "triageId" TEXT,
    "title" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAIProfile_doctorId_key" ON "DoctorAIProfile"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorAIProfile_doctorId_idx" ON "DoctorAIProfile"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorAIProfile_lastAIInteraction_idx" ON "DoctorAIProfile"("lastAIInteraction");

-- CreateIndex
CREATE INDEX "DoctorInsights_doctorId_isActive_priority_createdAt_idx" ON "DoctorInsights"("doctorId", "isActive", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorInsights_patientId_insightType_idx" ON "DoctorInsights"("patientId", "insightType");

-- CreateIndex
CREATE INDEX "DoctorInsights_aiService_createdAt_idx" ON "DoctorInsights"("aiService", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorInsights_expiresAt_idx" ON "DoctorInsights"("expiresAt");

-- CreateIndex
CREATE INDEX "DoctorInsights_isRead_priority_idx" ON "DoctorInsights"("isRead", "priority");

-- CreateIndex
CREATE INDEX "PatientAIAnalysis_patientId_analysisType_isValid_idx" ON "PatientAIAnalysis"("patientId", "analysisType", "isValid");

-- CreateIndex
CREATE INDEX "PatientAIAnalysis_doctorId_createdAt_idx" ON "PatientAIAnalysis"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientAIAnalysis_triageId_idx" ON "PatientAIAnalysis"("triageId");

-- CreateIndex
CREATE INDEX "PatientAIAnalysis_aiService_version_idx" ON "PatientAIAnalysis"("aiService", "version");

-- CreateIndex
CREATE INDEX "PatientAIAnalysis_expiresAt_idx" ON "PatientAIAnalysis"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAIAnalysis_patientId_analysisType_inputHash_key" ON "PatientAIAnalysis"("patientId", "analysisType", "inputHash");

-- CreateIndex
CREATE INDEX "DiagnosticAIResult_patientId_diagnosticType_idx" ON "DiagnosticAIResult"("patientId", "diagnosticType");

-- CreateIndex
CREATE INDEX "DiagnosticAIResult_doctorId_urgency_createdAt_idx" ON "DiagnosticAIResult"("doctorId", "urgency", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosticAIResult_aiService_createdAt_idx" ON "DiagnosticAIResult"("aiService", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosticAIResult_urgency_createdAt_idx" ON "DiagnosticAIResult"("urgency", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriorAuthorization_authorizationNumber_key" ON "PriorAuthorization"("authorizationNumber");

-- CreateIndex
CREATE INDEX "PriorAuthorization_patientId_status_idx" ON "PriorAuthorization"("patientId", "status");

-- CreateIndex
CREATE INDEX "PriorAuthorization_requestedBy_status_submittedAt_idx" ON "PriorAuthorization"("requestedBy", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "PriorAuthorization_aiProcessingStatus_idx" ON "PriorAuthorization"("aiProcessingStatus");

-- CreateIndex
CREATE INDEX "PriorAuthorization_status_submittedAt_idx" ON "PriorAuthorization"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "PriorAuthorization_validUntil_idx" ON "PriorAuthorization"("validUntil");

-- CreateIndex
CREATE INDEX "PriorAuthorization_authorizationNumber_idx" ON "PriorAuthorization"("authorizationNumber");

-- CreateIndex
CREATE INDEX "PriorAuthAIAnalysis_priorAuthId_idx" ON "PriorAuthAIAnalysis"("priorAuthId");

-- CreateIndex
CREATE INDEX "PriorAuthAIAnalysis_recommendation_confidence_idx" ON "PriorAuthAIAnalysis"("recommendation", "confidence");

-- CreateIndex
CREATE INDEX "PriorAuthAIAnalysis_aiService_createdAt_idx" ON "PriorAuthAIAnalysis"("aiService", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationAIAnalysis_prescriptionId_analysisType_idx" ON "MedicationAIAnalysis"("prescriptionId", "analysisType");

-- CreateIndex
CREATE INDEX "MedicationAIAnalysis_patientId_severity_idx" ON "MedicationAIAnalysis"("patientId", "severity");

-- CreateIndex
CREATE INDEX "MedicationAIAnalysis_doctorId_createdAt_idx" ON "MedicationAIAnalysis"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationAIAnalysis_severity_createdAt_idx" ON "MedicationAIAnalysis"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalAICoding_doctorId_reviewed_idx" ON "ClinicalAICoding"("doctorId", "reviewed");

-- CreateIndex
CREATE INDEX "ClinicalAICoding_patientId_createdAt_idx" ON "ClinicalAICoding"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalAICoding_noteId_idx" ON "ClinicalAICoding"("noteId");

-- CreateIndex
CREATE INDEX "ClinicalAICoding_reviewed_confidence_idx" ON "ClinicalAICoding"("reviewed", "confidence");

-- CreateIndex
CREATE INDEX "ScheduleAIRecommendation_doctorId_status_priority_idx" ON "ScheduleAIRecommendation"("doctorId", "status", "priority");

-- CreateIndex
CREATE INDEX "ScheduleAIRecommendation_patientId_status_idx" ON "ScheduleAIRecommendation"("patientId", "status");

-- CreateIndex
CREATE INDEX "ScheduleAIRecommendation_expiresAt_idx" ON "ScheduleAIRecommendation"("expiresAt");

-- CreateIndex
CREATE INDEX "ScheduleAIRecommendation_status_priority_createdAt_idx" ON "ScheduleAIRecommendation"("status", "priority", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientConsent_patientId_key" ON "PatientConsent"("patientId");

-- CreateIndex
CREATE INDEX "PatientConsent_patientId_idx" ON "PatientConsent"("patientId");

-- CreateIndex
CREATE INDEX "PatientConsent_consentGivenAt_idx" ON "PatientConsent"("consentGivenAt");

-- CreateIndex
CREATE INDEX "PatientConsent_withdrawnAt_idx" ON "PatientConsent"("withdrawnAt");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_patientId_createdAt_idx" ON "ConsentAuditLog"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_changedBy_idx" ON "ConsentAuditLog"("changedBy");

-- CreateIndex
CREATE INDEX "ConsentAuditLog_action_idx" ON "ConsentAuditLog"("action");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_dataCategory_idx" ON "DataRetentionPolicy"("dataCategory");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_effectiveFrom_effectiveUntil_idx" ON "DataRetentionPolicy"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "DataDisposalRecord_patientId_idx" ON "DataDisposalRecord"("patientId");

-- CreateIndex
CREATE INDEX "DataDisposalRecord_disposedAt_idx" ON "DataDisposalRecord"("disposedAt");

-- CreateIndex
CREATE INDEX "DataDisposalRecord_dataCategory_idx" ON "DataDisposalRecord"("dataCategory");

-- CreateIndex
CREATE INDEX "AIDataProcessingLog_patientId_aiService_idx" ON "AIDataProcessingLog"("patientId", "aiService");

-- CreateIndex
CREATE INDEX "AIDataProcessingLog_processedAt_idx" ON "AIDataProcessingLog"("processedAt");

-- CreateIndex
CREATE INDEX "AIDataProcessingLog_consentVerified_idx" ON "AIDataProcessingLog"("consentVerified");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_patientId_requestType_idx" ON "PatientRightsRequest"("patientId", "requestType");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_status_responseDeadline_idx" ON "PatientRightsRequest"("status", "responseDeadline");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_requestedAt_idx" ON "PatientRightsRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "PaymentMethod_patientId_isActive_idx" ON "PaymentMethod"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_provider_idx" ON "PaymentMethod"("type", "provider");

-- CreateIndex
CREATE INDEX "PaymentMethod_isPrimary_isDefault_idx" ON "PaymentMethod"("isPrimary", "isDefault");

-- CreateIndex
CREATE INDEX "Payment_patientId_status_idx" ON "Payment"("patientId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_paymentProcessor_processorTransactionId_idx" ON "Payment"("paymentProcessor", "processorTransactionId");

-- CreateIndex
CREATE INDEX "Payment_invoiceNumber_idx" ON "Payment"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_internalClaimId_key" ON "InsuranceClaim"("internalClaimId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_patientId_status_idx" ON "InsuranceClaim"("patientId", "status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_insuranceProviderId_status_idx" ON "InsuranceClaim"("insuranceProviderId", "status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimNumber_idx" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_serviceDate_idx" ON "InsuranceClaim"("serviceDate");

-- CreateIndex
CREATE INDEX "InsuranceClaim_submittedAt_idx" ON "InsuranceClaim"("submittedAt");

-- CreateIndex
CREATE INDEX "PaymentPlan_patientId_status_idx" ON "PaymentPlan"("patientId", "status");

-- CreateIndex
CREATE INDEX "PaymentPlan_nextPaymentDate_idx" ON "PaymentPlan"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "PaymentPlan_status_autoPayEnabled_idx" ON "PaymentPlan"("status", "autoPayEnabled");

-- CreateIndex
CREATE INDEX "PaymentPlanInstallment_paymentPlanId_installmentNumber_idx" ON "PaymentPlanInstallment"("paymentPlanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "PaymentPlanInstallment_dueDate_status_idx" ON "PaymentPlanInstallment"("dueDate", "status");

-- CreateIndex
CREATE INDEX "PaymentPlanInstallment_status_daysPastDue_idx" ON "PaymentPlanInstallment"("status", "daysPastDue");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_providerId_idx" ON "ClinicalNote"("patientId", "providerId");

-- CreateIndex
CREATE INDEX "ClinicalNote_noteType_status_idx" ON "ClinicalNote"("noteType", "status");

-- CreateIndex
CREATE INDEX "ClinicalNote_createdAt_idx" ON "ClinicalNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_invoiceNumber_key" ON "BillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingRecord_invoiceNumber_idx" ON "BillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "CareAction_patientId_idx" ON "CareAction"("patientId");

-- CreateIndex
CREATE INDEX "CareAction_providerId_idx" ON "CareAction"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_healthCardNumber_key" ON "Patient"("healthCardNumber");

-- CreateIndex
CREATE INDEX "Patient_healthCardNumber_idx" ON "Patient"("healthCardNumber");

-- CreateIndex
CREATE INDEX "Patient_governmentVerified_idx" ON "Patient"("governmentVerified");

-- AddForeignKey
ALTER TABLE "CareAction" ADD CONSTRAINT "CareAction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareAction" ADD CONSTRAINT "CareAction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareAction" ADD CONSTRAINT "CareAction_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "PatientTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAIProfile" ADD CONSTRAINT "DoctorAIProfile_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorInsights" ADD CONSTRAINT "DoctorInsights_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorInsights" ADD CONSTRAINT "DoctorInsights_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAIAnalysis" ADD CONSTRAINT "PatientAIAnalysis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAIAnalysis" ADD CONSTRAINT "PatientAIAnalysis_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAIAnalysis" ADD CONSTRAINT "PatientAIAnalysis_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "PatientTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAIResult" ADD CONSTRAINT "DiagnosticAIResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAIResult" ADD CONSTRAINT "DiagnosticAIResult_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthorization" ADD CONSTRAINT "PriorAuthorization_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorAuthAIAnalysis" ADD CONSTRAINT "PriorAuthAIAnalysis_priorAuthId_fkey" FOREIGN KEY ("priorAuthId") REFERENCES "PriorAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAIAnalysis" ADD CONSTRAINT "MedicationAIAnalysis_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAIAnalysis" ADD CONSTRAINT "MedicationAIAnalysis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAIAnalysis" ADD CONSTRAINT "MedicationAIAnalysis_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAICoding" ADD CONSTRAINT "ClinicalAICoding_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ProviderNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAICoding" ADD CONSTRAINT "ClinicalAICoding_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAICoding" ADD CONSTRAINT "ClinicalAICoding_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAICoding" ADD CONSTRAINT "ClinicalAICoding_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAIRecommendation" ADD CONSTRAINT "ScheduleAIRecommendation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAIRecommendation" ADD CONSTRAINT "ScheduleAIRecommendation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "ConsentAuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "ConsentAuditLog_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "PatientConsent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "ConsentAuditLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDisposalRecord" ADD CONSTRAINT "DataDisposalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDisposalRecord" ADD CONSTRAINT "DataDisposalRecord_disposedBy_fkey" FOREIGN KEY ("disposedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDisposalRecord" ADD CONSTRAINT "DataDisposalRecord_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDataProcessingLog" ADD CONSTRAINT "AIDataProcessingLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDataProcessingLog" ADD CONSTRAINT "AIDataProcessingLog_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refundedBy_fkey" FOREIGN KEY ("refundedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceNumber_fkey" FOREIGN KEY ("invoiceNumber") REFERENCES "BillingRecord"("invoiceNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_priorAuthNumber_fkey" FOREIGN KEY ("priorAuthNumber") REFERENCES "PriorAuthorization"("authorizationNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlanInstallment" ADD CONSTRAINT "PaymentPlanInstallment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlanInstallment" ADD CONSTRAINT "PaymentPlanInstallment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ScheduleSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "PatientTriage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

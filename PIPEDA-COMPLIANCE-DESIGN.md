# 🛡️ **PIPEDA COMPLIANCE - PATIENT CONSENT & DATA GOVERNANCE**

## 🚨 **CRITICAL REQUIREMENT**
Before implementing AI features, we MUST have proper PIPEDA-compliant consent management for:
- ✅ **Collection** of personal health information
- ✅ **Use** of data for AI analysis  
- ✅ **Disclosure** to AI services
- ✅ **Retention** periods and disposal
- ✅ **Patient rights** (access, correction, withdrawal)

---

## 📋 **PIPEDA CONSENT REQUIREMENTS**

### **1. Specific Consent Categories**
```
- BASIC_CARE: Essential healthcare delivery
- AI_ANALYSIS: AI-powered clinical analysis
- AI_DIAGNOSTICS: AI diagnostic tools (Radiology, Lab AI)
- AI_MEDICATION: AI medication analysis
- AI_MENTAL_HEALTH: Mental health AI assessment
- AI_TRIAGE: AI triage and prioritization
- DATA_SHARING: Sharing with healthcare team
- RESEARCH: De-identified research purposes
- ADMINISTRATIVE: Insurance, billing, scheduling
```

### **2. Granular AI Service Consent**
```
- DOCTOR_AI_ASSISTANT: Clinical decision support
- RADIOLOGY_AI: Medical imaging analysis
- LABORATORY_AI: Lab result interpretation  
- PHARMACIST_AI: Medication safety analysis
- MENTAL_HEALTH_AI: Psychological assessment
- PRIOR_AUTH_AI: Insurance pre-authorization
- MEDICAL_CODING_AI: Clinical coding automation
- PATIENT_COMMUNICATION_AI: Patient engagement
```

---

## 🏗️ **PIPEDA-COMPLIANT SCHEMA DESIGN**

### **1. Patient Consent Management**
```sql
model PatientConsent {
  id                    String   @id @default(cuid())
  patientId             String
  
  -- Consent Categories
  basicCare             Boolean  @default(true)   -- Required for healthcare
  aiAnalysis            Boolean  @default(false)  -- AI clinical analysis
  aiDiagnostics         Boolean  @default(false)  -- AI diagnostic tools
  aiMedication          Boolean  @default(false)  -- AI medication analysis
  aiMentalHealth        Boolean  @default(false)  -- Mental health AI
  aiTriage              Boolean  @default(false)  -- AI triage analysis
  dataSharing           Boolean  @default(false)  -- Healthcare team sharing
  research              Boolean  @default(false)  -- Research purposes
  administrative        Boolean  @default(true)   -- Billing, scheduling
  
  -- AI Service Specific Consent
  doctorAIAssistant     Boolean  @default(false)
  radiologyAI           Boolean  @default(false)
  laboratoryAI          Boolean  @default(false)
  pharmacistAI          Boolean  @default(false)
  mentalHealthAI        Boolean  @default(false)
  priorAuthAI           Boolean  @default(false)
  medicalCodingAI       Boolean  @default(false)
  patientCommunicationAI Boolean @default(false)
  
  -- Consent Metadata
  consentVersion        String   @default("1.0")  -- Version of consent form
  consentMethod         String   -- 'ELECTRONIC', 'VERBAL', 'WRITTEN'
  witnessedBy           String?  -- Staff member who witnessed
  ipAddress             String?  -- For electronic consent
  deviceInfo            String?  -- Device used for consent
  
  -- Consent Lifecycle
  consentGivenAt        DateTime @default(now())
  consentExpiresAt      DateTime? -- Some consents may expire
  lastReviewedAt        DateTime? -- Last time patient reviewed
  withdrawnAt           DateTime? -- If consent withdrawn
  withdrawnBy           String?   -- Who processed withdrawal
  withdrawalReason      String?   -- Reason for withdrawal
  
  -- PIPEDA Rights
  dataAccessRequested   DateTime? -- When patient requested data access
  dataCorrectionRequested DateTime? -- When patient requested correction
  dataPortabilityRequested DateTime? -- When patient requested data export
  
  -- Relationships
  patient               Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId])
  @@index([consentGivenAt])
  @@index([withdrawnAt])
}

model ConsentAuditLog {
  id                    String   @id @default(cuid())
  patientId             String
  consentId             String
  
  -- Change Details
  action                String   -- 'GRANTED', 'WITHDRAWN', 'MODIFIED', 'REVIEWED'
  changedFields         String[] -- Which consent fields changed
  previousValues        Json?    -- Previous consent state
  newValues             Json?    -- New consent state
  
  -- Actor Information
  changedBy             String   -- User ID who made change
  changedByRole         String   -- Role of person making change
  patientInitiated      Boolean  @default(false) -- Did patient initiate?
  
  -- Context
  reason                String?  -- Reason for change
  method                String   -- How change was made
  ipAddress             String?
  deviceInfo            String?
  
  -- Compliance
  legalBasis            String   -- Legal basis for processing
  dataController        String   -- Who is the data controller
  
  createdAt             DateTime @default(now())
  
  patient               Patient  @relation(fields: [patientId], references: [id])
  consent               PatientConsent @relation(fields: [consentId], references: [id])
  changedByUser         User     @relation(fields: [changedBy], references: [id])
  
  @@index([patientId, createdAt])
  @@index([changedBy])
  @@index([action])
}
```

### **2. Data Retention & Disposal**
```sql
model DataRetentionPolicy {
  id                    String   @id @default(cuid())
  dataCategory          String   -- 'PHI', 'AI_ANALYSIS', 'DIAGNOSTIC', 'MEDICATION'
  
  -- Retention Rules
  retentionPeriodYears  Int      -- Years to retain
  legalBasis            String   -- Legal requirement for retention
  disposalMethod        String   -- How to dispose of data
  
  -- Policy Details
  description           String
  applicableLaws        String[] -- PIPEDA, provincial laws, etc.
  lastReviewedAt        DateTime
  effectiveFrom         DateTime @default(now())
  effectiveUntil        DateTime?
  
  @@index([dataCategory])
  @@index([effectiveFrom, effectiveUntil])
}

model DataDisposalRecord {
  id                    String   @id @default(cuid())
  patientId             String?  -- Null if bulk disposal
  
  -- Disposal Details
  dataCategory          String   -- What type of data
  disposalReason        String   -- 'RETENTION_EXPIRED', 'PATIENT_REQUEST', 'LEGAL_REQUIREMENT'
  disposalMethod        String   -- 'SECURE_DELETE', 'ANONYMIZATION', 'ARCHIVE'
  
  -- Data Identification
  recordsAffected       Int      -- Number of records
  dataIdentifiers       String[] -- IDs of disposed records
  disposalHash          String   -- Hash proof of disposal
  
  -- Compliance
  disposedBy            String   -- User who performed disposal
  authorizedBy          String   -- User who authorized disposal
  legalBasis            String   -- Legal basis for disposal
  
  -- Verification
  verificationMethod    String   -- How disposal was verified
  verifiedAt            DateTime?
  verifiedBy            String?
  
  disposedAt            DateTime @default(now())
  
  patient               Patient? @relation(fields: [patientId], references: [id])
  disposedByUser        User     @relation("DataDisposalDisposedBy", fields: [disposedBy], references: [id])
  authorizedByUser      User     @relation("DataDisposalAuthorizedBy", fields: [authorizedBy], references: [id])
  
  @@index([patientId])
  @@index([disposedAt])
  @@index([dataCategory])
}
```

### **3. AI Data Processing Compliance**
```sql
model AIDataProcessingLog {
  id                    String   @id @default(cuid())
  patientId             String
  
  -- AI Processing Details
  aiService             String   -- Which AI service processed data
  processingPurpose     String   -- Why data was processed
  dataCategories        String[] -- What types of data were used
  
  -- Consent Verification
  consentVerified       Boolean  -- Was consent checked?
  consentVersion        String   -- Version of consent at time of processing
  missingConsents       String[] -- Any missing consent categories
  
  -- Data Minimization
  dataMinimized         Boolean  -- Was data minimized for purpose?
  dataFields            String[] -- Specific fields processed
  dataRetentionDays     Int      -- How long AI service retains data
  
  -- Processing Results
  processingSuccessful  Boolean
  confidenceScore       Float?
  resultsRetained       Boolean  -- Are results stored?
  resultsShared         Boolean  -- Were results shared?
  
  -- Compliance
  legalBasis            String   -- Legal basis for processing
  dataController        String   -- Who controls the data
  dataProcessor         String   -- AI service provider
  transferMechanism     String?  -- If data transferred (adequacy, SCC, etc.)
  
  -- Audit Trail
  processedBy           String   -- User who initiated processing
  processedAt           DateTime @default(now())
  
  patient               Patient  @relation(fields: [patientId], references: [id])
  processedByUser       User     @relation(fields: [processedBy], references: [id])
  
  @@index([patientId, aiService])
  @@index([processedAt])
  @@index([consentVerified])
}
```

### **4. Patient Rights Management**
```sql
model PatientRightsRequest {
  id                    String   @id @default(cuid())
  patientId             String
  
  -- Request Details
  requestType           String   -- 'ACCESS', 'CORRECTION', 'WITHDRAWAL', 'PORTABILITY', 'COMPLAINT'
  description           String
  specificData          String[] -- Specific data requested
  
  -- Request Processing
  status                String   @default("RECEIVED") -- RECEIVED, PROCESSING, COMPLETED, DENIED
  assignedTo            String?  -- Staff member handling request
  
  -- Response
  responseDeadline      DateTime -- 30 days from receipt (PIPEDA requirement)
  responseProvided      Boolean  @default(false)
  responseMethod        String?  -- How response was provided
  responseDetails       String?
  
  -- Denial (if applicable)
  denialReason          String?  -- If request denied
  denialLegalBasis      String?  -- Legal basis for denial
  appealRights          String?  -- How to appeal denial
  
  -- Compliance
  verificationMethod    String   -- How patient identity was verified
  verifiedAt            DateTime?
  processingFee         Float?   -- If fee charged (rare in healthcare)
  
  requestedAt           DateTime @default(now())
  completedAt           DateTime?
  
  patient               Patient  @relation(fields: [patientId], references: [id])
  assignedToUser        User?    @relation(fields: [assignedTo], references: [id])
  
  @@index([patientId, requestType])
  @@index([status, responseDeadline])
  @@index([requestedAt])
}
```

---

## 🔒 **CONSENT VALIDATION MIDDLEWARE**

### **Before ANY AI Processing:**
```typescript
class PIPEDAConsentValidator {
  static async validateAIProcessing(
    patientId: string, 
    aiService: string, 
    purpose: string
  ): Promise<ConsentValidationResult> {
    
    const consent = await prisma.patientConsent.findUnique({
      where: { patientId }
    });
    
    // Check specific AI service consent
    const serviceConsent = this.checkServiceConsent(consent, aiService);
    
    // Check purpose-based consent
    const purposeConsent = this.checkPurposeConsent(consent, purpose);
    
    // Log the consent check
    await this.logConsentCheck(patientId, aiService, serviceConsent);
    
    return {
      allowed: serviceConsent && purposeConsent,
      missingConsents: this.getMissingConsents(consent, aiService, purpose),
      expiresAt: consent?.consentExpiresAt
    };
  }
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Before AI Features Go Live:**
- [ ] Patient consent forms updated with AI-specific language
- [ ] Consent collection workflow implemented
- [ ] Data retention policies defined
- [ ] AI service data processing agreements signed
- [ ] Staff training on PIPEDA compliance
- [ ] Consent validation middleware implemented
- [ ] Patient rights request handling process
- [ ] Data disposal procedures automated
- [ ] Audit logging for all data access
- [ ] Privacy impact assessment completed

---

## 🚨 **CRITICAL: NO AI WITHOUT CONSENT**

**Every AI API call MUST:**
1. ✅ Check patient consent first
2. ✅ Log the data processing
3. ✅ Respect data minimization
4. ✅ Honor retention limits
5. ✅ Provide audit trail

**Should I add these PIPEDA compliance models to the schema before proceeding?** 🛡️

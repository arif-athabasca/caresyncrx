# 🔍 **SCHEMA REVIEW & OPTIMIZATION ANALYSIS**

## ⚠️ **BREAKING CHANGES ASSESSMENT**

### **SAFE - No Breaking Changes:**
✅ **Adding new tables** (DoctorInsights, PatientAIAnalysis, etc.) - Safe  
✅ **Adding optional fields** to existing tables - Safe  
✅ **Adding new relationships** - Safe  

### **POTENTIAL ISSUES IDENTIFIED:**

1. **User Table Bloat** 🚨
   - Adding 5+ AI relationships makes User table very heavy
   - Each doctor query will load unnecessary AI relationship metadata
   - Solution: Separate AI profile table

2. **Query Performance** 🚨
   - AI tables lack proper indexing strategy
   - JSON fields without indexed access patterns
   - No partitioning for large AI datasets

3. **Prior Authorization Missing** 🚨
   - No dedicated schema for Prior Authorization AI
   - Insurance pre-approval workflow not modeled

---

## 🏗️ **OPTIMIZED SCHEMA DESIGN**

### **1. Separate AI Profile from User Table**
```sql
-- Keep User table clean, move AI settings to separate table
model DoctorAIProfile {
  id                    String   @id @default(cuid())
  doctorId              String   @unique
  aiPreferences         Json?    -- AI service configurations
  confidenceThresholds  Json?    -- Minimum confidence levels
  enabledServices       String[] -- Which AI services to use
  lastAIInteraction     DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  doctor                User     @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  
  @@index([doctorId])
}
```

### **2. Indexed AI Insights with Partitioning Strategy**
```sql
model DoctorInsights {
  id          String   @id @default(cuid())
  doctorId    String
  patientId   String?
  insightType String   -- 'RISK_ASSESSMENT', 'FOLLOW_UP', 'ALERT'
  aiService   String   -- 'DOCTOR_AI', 'TRIAGE_AI', etc.
  data        Json
  confidence  Float
  priority    Int      @default(0) -- For quick priority sorting
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  
  doctor      User     @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  patient     Patient? @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  -- Optimized indexes for common queries
  @@index([doctorId, isActive, priority])
  @@index([patientId, insightType])
  @@index([aiService, createdAt])
  @@index([expiresAt]) -- For cleanup jobs
}
```

### **3. Prior Authorization AI - Complete Workflow**
```sql
model PriorAuthorization {
  id                    String   @id @default(cuid())
  patientId             String
  prescriptionId        String?
  procedureCode         String?  -- CPT/HCPCS codes
  diagnosisCode         String?  -- ICD-10 codes
  insuranceProviderId   String
  requestedBy           String   -- Doctor ID
  
  -- AI Processing
  aiProcessingStatus    String   @default("PENDING") -- PENDING, PROCESSING, COMPLETED, FAILED
  aiConfidence          Float?
  aiRecommendation      String?  -- APPROVE, DENY, REVIEW_REQUIRED
  aiReasoning           Json?    -- AI decision explanation
  
  -- Workflow Status
  status                String   @default("SUBMITTED") -- SUBMITTED, APPROVED, DENIED, PENDING_REVIEW
  submittedAt           DateTime @default(now())
  processedAt           DateTime?
  approvedAt            DateTime?
  
  -- Clinical Data
  clinicalData          Json     -- Extracted clinical information
  supportingDocuments   String[] -- Document URLs
  medicalNecessity      Text?    -- AI-generated justification
  
  -- Insurance Response
  insuranceResponse     Json?    -- Response from insurance API
  authorizationNumber   String?  -- If approved
  validFrom             DateTime?
  validUntil            DateTime?
  
  -- Relationships
  patient               Patient         @relation(fields: [patientId], references: [id])
  prescription          Prescription?   @relation(fields: [prescriptionId], references: [id])
  insuranceProvider     InsuranceProvider @relation(fields: [insuranceProviderId], references: [id])
  requestedByUser       User            @relation(fields: [requestedBy], references: [id])
  
  -- Optimized indexes
  @@index([patientId, status])
  @@index([requestedBy, status])
  @@index([aiProcessingStatus])
  @@index([submittedAt])
  @@index([validUntil]) -- For expiration checking
}

model PriorAuthAIAnalysis {
  id                    String   @id @default(cuid())
  priorAuthId           String
  aiService             String   @default("PRIOR_AUTH_AI")
  
  -- Clinical Data Extraction
  extractedData         Json     -- AI-extracted clinical information
  payerRequirements     Json     -- Matched payer requirements
  complianceScore       Float    -- How well request meets requirements
  
  -- Decision Support
  recommendation        String   -- APPROVE, DENY, NEEDS_MORE_INFO
  confidence            Float
  reasoning             Text     -- AI explanation
  riskFactors           String[] -- Identified risk factors
  
  -- Process Optimization
  processingTime        Int      -- Milliseconds
  dataQuality          Float    -- Quality of input data
  improvementSuggestions Text?   -- How to improve approval chances
  
  createdAt             DateTime @default(now())
  
  priorAuth             PriorAuthorization @relation(fields: [priorAuthId], references: [id], onDelete: Cascade)
  
  @@index([priorAuthId])
  @@index([recommendation, confidence])
}
```

### **4. Efficient AI Analysis Caching**
```sql
model PatientAIAnalysis {
  id           String   @id @default(cuid())
  patientId    String
  doctorId     String
  analysisType String   -- 'DIAGNOSIS', 'CARE_PLAN', 'MENTAL_HEALTH', 'RISK_ASSESSMENT'
  aiService    String
  
  -- Analysis Results
  analysis     Json
  confidence   Float
  priority     Int      @default(0)
  
  -- Caching & Performance
  inputHash    String   -- Hash of input data for cache validation
  isValid      Boolean  @default(true)
  expiresAt    DateTime -- Auto-expire old analysis
  
  -- Metadata
  processingTime Int?   -- Performance tracking
  version       String @default("1.0") -- AI model version
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  patient      Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor       User     @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  
  -- Optimized indexes
  @@index([patientId, analysisType, isValid])
  @@index([doctorId, createdAt])
  @@index([aiService, version])
  @@index([expiresAt]) -- For cleanup
  @@unique([patientId, analysisType, inputHash]) -- Prevent duplicate analysis
}
```

### **5. Lightweight Diagnostic AI Results**
```sql
model DiagnosticAIResult {
  id            String   @id @default(cuid())
  patientId     String
  doctorId      String
  diagnosticType String  -- 'RADIOLOGY', 'LABORATORY', 'PATHOLOGY'
  aiService     String
  
  -- Core Results
  findings      String[]
  confidence    Float
  urgency       String   @default("ROUTINE") -- ROUTINE, URGENT, CRITICAL
  
  -- Minimal Data Storage
  summary       Text     -- AI-generated summary
  recommendations String[] -- Key recommendations only
  
  -- Reference Data
  sourceDataUrl String?  -- Link to actual images/labs
  reportGenerated Boolean @default(false)
  
  createdAt     DateTime @default(now())
  
  patient       Patient  @relation(fields: [patientId], references: [id])
  doctor        User     @relation(fields: [doctorId], references: [id])
  
  @@index([patientId, diagnosticType])
  @@index([doctorId, urgency])
  @@index([createdAt])
}
```

---

## 🚀 **PERFORMANCE OPTIMIZATIONS**

### **1. Query Optimization**
```sql
-- Add composite indexes for common doctor queries
@@index([doctorId, isActive, priority, createdAt])  -- Dashboard queries
@@index([patientId, aiService, confidence])         -- Patient analysis
@@index([aiService, status, updatedAt])             -- AI service monitoring
```

### **2. Data Lifecycle Management**
```sql
-- Auto-cleanup expired AI data
- expiresAt fields on all AI tables
- Background jobs to cleanup expired records
- Archive vs delete strategy for compliance
```

### **3. JSON Field Indexing (PostgreSQL)**
```sql
-- If using PostgreSQL, add JSON indexes
CREATE INDEX CONCURRENTLY idx_ai_analysis_type 
ON "PatientAIAnalysis" USING GIN ((analysis->'type'));

CREATE INDEX CONCURRENTLY idx_prior_auth_status 
ON "PriorAuthorization" USING GIN ((aiRecommendation));
```

---

## ✅ **FINAL OPTIMIZED SCHEMA CHANGES**

### **What We're Adding:**
1. ✅ **DoctorAIProfile** - Separate AI preferences from User table
2. ✅ **PriorAuthorization** - Complete Prior Auth AI workflow
3. ✅ **PriorAuthAIAnalysis** - AI analysis for prior authorizations
4. ✅ **Optimized AI tables** with proper indexing
5. ✅ **Data lifecycle management** with expiration

### **What We're NOT Changing:**
- ❌ No modifications to existing User table structure
- ❌ No breaking changes to existing relationships
- ❌ No changes to existing application code

---

## 🎯 **RECOMMENDATION**

**PROCEED WITH OPTIMIZED SCHEMA** - This design:
- ✅ No breaking changes to existing code
- ✅ Efficient queries with proper indexing  
- ✅ Scalable AI data management
- ✅ Complete Prior Authorization AI support
- ✅ User table stays lean and fast
- ✅ Built-in data lifecycle management

**Next Steps:**
1. Apply optimized schema changes
2. Generate migration
3. Implement Patient Tab APIs
4. Test performance with sample data

**Ready to proceed?** 🚀

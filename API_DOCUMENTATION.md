# CareSyncRx AI Healthcare API - Complete Service Documentation

## 🏥 **API Overview**
**Base URL:** `http://localhost:4000/api/v1/healthcare`  
**Content-Type:** `application/json`  
**Authentication:** API Key (if configured)

---

## 📋 **Complete Service List**

### **1. Healthcare Triage AI**
**Endpoint:** `POST /api/v1/triage`

#### Input:
```json
{
  "symptoms": "string (1-2000 chars, required)",
  "patientAge": "number (0-150, optional)",
  "medicalHistory": ["string array (max 20 items, optional)"],
  "urgency": "string (low/moderate/high/critical, optional)",
  "patientGender": "string (male/female/other/prefer_not_to_say, optional)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "urgency": "moderate",
    "recommendations": ["Consult primary care physician"],
    "differentialDiagnosis": ["Common cold", "Allergic rhinitis"],
    "redFlags": [],
    "triageCategory": "routine"
  },
  "metadata": {
    "processingTime": "1.2s",
    "model": "biomedical-bert-triage",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **2. Doctor AI Assistant**
**Endpoint:** `POST /api/v1/healthcare/doctor`

#### Input:
```json
{
  "consultationType": "string (diagnosis/treatment/documentation/referral, required)",
  "patientData": {
    "age": "number",
    "gender": "string",
    "symptoms": "string",
    "medicalHistory": ["string array"],
    "currentMedications": ["string array"]
  },
  "clinicalQuestion": "string (1-2000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "recommendations": ["Clinical recommendation 1", "Clinical recommendation 2"],
    "differentialDiagnosis": ["Diagnosis 1", "Diagnosis 2"],
    "treatmentPlan": "Detailed treatment plan",
    "followUpInstructions": "Follow-up recommendations",
    "redFlags": ["Warning sign 1"],
    "confidence": 0.85
  },
  "metadata": {
    "processingTime": "1.5s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **3. Pharmacist AI**
**Endpoint:** `POST /api/v1/healthcare/pharmacist`

#### Input:
```json
{
  "action": "string (interaction_check/dosage_optimization/side_effects/medication_review, required)",
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string"
    }
  ],
  "patientData": {
    "age": "number",
    "weight": "number",
    "allergies": ["string array"],
    "conditions": ["string array"]
  },
  "query": "string (1-1000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "drugInteractions": [
      {
        "medications": ["Drug A", "Drug B"],
        "severity": "moderate",
        "description": "Interaction description",
        "recommendations": "Action to take"
      }
    ],
    "dosageRecommendations": "Dosage adjustments",
    "sideEffects": ["Side effect 1", "Side effect 2"],
    "alternatives": ["Alternative medication 1"],
    "warnings": ["Important warning"]
  },
  "metadata": {
    "processingTime": "1.1s",
    "model": "BiomedNLP-PubMedBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **4. Nurse AI Assistant**
**Endpoint:** `POST /api/v1/healthcare/nurse`

#### Input:
```json
{
  "assessmentType": "string (care_planning/patient_assessment/discharge_planning/vital_signs, required)",
  "patientData": {
    "age": "number",
    "condition": "string",
    "vitalSigns": {
      "temperature": "number",
      "bloodPressure": "string",
      "heartRate": "number",
      "respiratoryRate": "number"
    }
  },
  "query": "string (1-1500 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "carePlan": "Detailed care plan",
    "assessmentFindings": "Assessment results",
    "interventions": ["Intervention 1", "Intervention 2"],
    "dischargeInstructions": "Discharge planning",
    "monitoringPlan": "Monitoring recommendations",
    "educationNeeds": ["Patient education topic 1"]
  },
  "metadata": {
    "processingTime": "1.3s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **5. Mental Health AI**
**Endpoint:** `POST /api/v1/healthcare/mental-health`

#### Input:
```json
{
  "assessmentType": "string (screening/risk_assessment/therapy_planning, required)",
  "patientData": {
    "age": "number",
    "gender": "string",
    "symptoms": ["string array"],
    "mentalHealthHistory": ["string array"],
    "currentStressors": ["string array"]
  },
  "query": "string (1-2000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "riskAssessment": "Low/Moderate/High",
    "screeningResults": "Screening interpretation",
    "treatmentRecommendations": ["Treatment option 1", "Treatment option 2"],
    "therapyApproaches": ["CBT", "DBT"],
    "referralNeeds": "Referral recommendations",
    "safetyPlan": "Crisis intervention plan",
    "followUpSchedule": "Follow-up timing"
  },
  "metadata": {
    "processingTime": "1.4s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **6. Radiology AI**
**Endpoint:** `POST /api/v1/healthcare/radiology`

#### Input:
```json
{
  "imageData": {
    "type": "string (xray/ct/mri/ultrasound)",
    "bodyPart": "string",
    "imageUrl": "string (optional)",
    "imageBase64": "string (optional)",
    "metadata": {
      "acquisitionDate": "string",
      "technique": "string"
    }
  },
  "studyType": "string (required)",
  "clinicalQuestion": "string (1-1000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "findings": "Detailed radiological findings",
    "impression": "Clinical impression",
    "abnormalities": [
      {
        "location": "anatomical location",
        "description": "abnormality description",
        "severity": "mild/moderate/severe"
      }
    ],
    "recommendations": ["Follow-up recommendation 1"],
    "comparison": "Comparison with previous studies",
    "technicalQuality": "Image quality assessment"
  },
  "metadata": {
    "processingTime": "2.1s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **7. Laboratory AI**
**Endpoint:** `POST /api/v1/healthcare/laboratory`

#### Input:
```json
{
  "labResults": [
    {
      "testName": "string",
      "value": "number or string",
      "unit": "string",
      "referenceRange": "string",
      "flagged": "boolean (optional)"
    }
  ],
  "patientData": {
    "age": "number",
    "gender": "string",
    "medicalHistory": ["string array"],
    "currentMedications": ["string array"]
  },
  "query": "string (1-1000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "interpretation": "Overall lab interpretation",
    "abnormalResults": [
      {
        "testName": "Test name",
        "value": "abnormal value",
        "significance": "clinical significance",
        "possibleCauses": ["cause 1", "cause 2"]
      }
    ],
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "followUpTests": ["Additional test 1"],
    "clinicalCorrelation": "Clinical context"
  },
  "metadata": {
    "processingTime": "1.3s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **8. Advanced Laboratory AI** ⭐
**Endpoint:** `POST /api/v1/healthcare/advanced-laboratory`

#### Input:
```json
{
  "action": "string (detect_critical_values/analyze_trends/validate_reference_ranges, required)",
  "labResults": [
    {
      "testName": "string",
      "value": "number",
      "unit": "string",
      "referenceRange": "string",
      "timestamp": "string (ISO date, optional)"
    }
  ],
  "historicalResults": [
    {
      "testName": "string",
      "value": "number",
      "timestamp": "string (ISO date)"
    }
  ],
  "patientData": {
    "age": "number",
    "gender": "string",
    "ethnicity": "string (optional)",
    "conditions": ["string array"]
  },
  "timeframe": "string (3months/6months/1year, optional)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "criticalValues": [
      {
        "testName": "string",
        "value": "number",
        "severity": "critical/high/moderate",
        "immediateActions": ["Action 1", "Action 2"],
        "timeToIntervention": "immediate/within 1 hour"
      }
    ],
    "trends": [
      {
        "testName": "string",
        "trendDirection": "increasing/decreasing/stable",
        "significance": "clinical interpretation",
        "projectedOutcome": "future prediction"
      }
    ],
    "referenceValidation": [
      {
        "testName": "string",
        "populationSpecificRange": "adjusted range",
        "standardRange": "standard range",
        "recommendation": "use population-specific range"
      }
    ]
  },
  "metadata": {
    "processingTime": "1.8s",
    "model": "Bio_ClinicalBERT + SciBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **9. Pathology AI** ⭐
**Endpoint:** `POST /api/v1/healthcare/pathology`

#### Input:
```json
{
  "action": "string (analyze_tissue_sample/detect_cancer/interpret_microscopy/generate_report, required)",
  "sampleData": {
    "tissueType": "string",
    "stainType": "string (H&E/IHC/special, optional)",
    "imageUrl": "string (optional)",
    "imageBase64": "string (optional)"
  },
  "pathologyData": {
    "cellularFindings": "string",
    "architecturalPattern": "string",
    "suspiciousAreas": ["string array"]
  },
  "microscopData": {
    "magnification": "string (10x/40x/100x)",
    "fieldOfView": "string",
    "cellularDetails": "string"
  },
  "patientData": {
    "age": "number",
    "gender": "string",
    "clinicalHistory": "string",
    "priorBiopsies": ["string array"]
  },
  "clinicalContext": "string (optional)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "tissueAnalysis": {
      "cellularMorphology": "detailed description",
      "architecturalFeatures": "tissue organization",
      "abnormalFindings": ["finding 1", "finding 2"]
    },
    "cancerDetection": {
      "malignancyRisk": "low/moderate/high/very high",
      "cancerType": "specific cancer type (if detected)",
      "grade": "tumor grade",
      "stage": "preliminary staging",
      "biomarkers": ["biomarker 1", "biomarker 2"]
    },
    "microscopyInterpretation": {
      "cellularDetails": "microscopic findings",
      "diagnosticFeatures": ["feature 1", "feature 2"],
      "differentialDiagnosis": ["diagnosis 1", "diagnosis 2"]
    },
    "pathologyReport": "Complete formatted pathology report",
    "recommendations": ["Additional staining needed", "Molecular testing suggested"]
  },
  "metadata": {
    "processingTime": "2.5s",
    "model": "PubMedBERT + ViT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **10. Advanced Imaging AI** ⭐
**Endpoint:** `POST /api/v1/healthcare/advanced-imaging`

#### Input:
```json
{
  "action": "string (analyze_cross_sectional/perform_3d_reconstruction/perform_volumetric_analysis/compare_previous_studies/perform_mpr_analysis, required)",
  "imagingData": {
    "modalityType": "string (CT/MRI/PET)",
    "bodyRegion": "string",
    "imageUrls": ["string array"],
    "dicomData": "string (base64, optional)",
    "acquisitionParameters": {
      "sliceThickness": "number",
      "contrastUsed": "boolean",
      "sequence": "string (for MRI)"
    }
  },
  "volumeData": {
    "dimensions": {"x": "number", "y": "number", "z": "number"},
    "voxelSpacing": {"x": "number", "y": "number", "z": "number"},
    "seriesData": "string (base64)"
  },
  "targetStructures": ["string array (organ/lesion names)"],
  "currentStudy": {
    "studyDate": "string (ISO date)",
    "findings": "string"
  },
  "previousStudies": [
    {
      "studyDate": "string (ISO date)",
      "findings": "string",
      "measurements": "object"
    }
  ],
  "planes": ["axial", "coronal", "sagittal"],
  "patientData": {
    "age": "number",
    "gender": "string",
    "clinicalIndication": "string"
  },
  "clinicalContext": "string (optional)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "crossSectionalAnalysis": {
      "findings": "Detailed cross-sectional findings",
      "abnormalities": [
        {
          "location": "anatomical location",
          "size": "measurements",
          "characteristics": "imaging characteristics",
          "significance": "clinical significance"
        }
      ],
      "normalStructures": ["structure 1", "structure 2"]
    },
    "reconstruction3D": {
      "reconstructionQuality": "excellent/good/fair",
      "volumeRendering": "3D volume description",
      "spatialRelationships": "anatomical relationships",
      "reconstructionUrl": "string (3D model URL)"
    },
    "volumetricAnalysis": {
      "measurements": {
        "totalVolume": "number (ml)",
        "lesionVolume": "number (ml)",
        "organVolume": "number (ml)"
      },
      "volumeChanges": "comparison with previous studies",
      "growthRate": "volume change rate"
    },
    "comparativeAnalysis": {
      "intervalChanges": ["change 1", "change 2"],
      "progression": "stable/improving/worsening",
      "quantitativeChanges": "numerical comparisons",
      "newFindings": ["new finding 1"]
    },
    "mprAnalysis": {
      "axialFindings": "axial plane findings",
      "coronalFindings": "coronal plane findings",
      "sagittalFindings": "sagittal plane findings",
      "optimalViews": ["recommended viewing planes"]
    }
  },
  "metadata": {
    "processingTime": "3.2s",
    "model": "ViT + DETR-ResNet",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **11. Prior Authorization AI**
**Endpoint:** `POST /api/v1/healthcare/prior-auth`

#### Input:
```json
{
  "authType": "string (medication/procedure/imaging/dme, required)",
  "requestData": {
    "item": "string (medication name or procedure code)",
    "indication": "string",
    "diagnosis": "string (ICD-10 code)",
    "providerInfo": {
      "npi": "string",
      "name": "string",
      "specialty": "string"
    }
  },
  "patientData": {
    "age": "number",
    "gender": "string",
    "insurance": "string",
    "medicalHistory": ["string array"]
  },
  "clinicalData": "string (1-2000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "approvalLikelihood": "high/moderate/low",
    "requiredDocumentation": ["Document 1", "Document 2"],
    "preAuthForm": "Generated form content",
    "clinicalJustification": "Medical necessity explanation",
    "alternativeOptions": ["Alternative 1", "Alternative 2"],
    "timeline": "Expected processing time",
    "tips": ["Tip for approval"]
  },
  "metadata": {
    "processingTime": "1.6s",
    "model": "biobert-base-cased",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **12. Medical Coding AI**
**Endpoint:** `POST /api/v1/healthcare/medical-coding`

#### Input:
```json
{
  "codingType": "string (icd10/cpt/hcpcs/drg, required)",
  "clinicalData": {
    "diagnosis": "string",
    "procedures": ["string array"],
    "symptoms": ["string array"],
    "treatmentProvided": "string"
  },
  "encounterData": {
    "encounterType": "string (inpatient/outpatient/emergency)",
    "duration": "string",
    "complexity": "string (low/moderate/high)"
  },
  "documentation": "string (1-3000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "suggestedCodes": [
      {
        "code": "string",
        "description": "string",
        "confidence": "number (0-1)",
        "category": "primary/secondary"
      }
    ],
    "complianceCheck": "compliant/needs review",
    "codeValidation": "codes validated",
    "reimbursementImpact": "financial impact assessment",
    "documentation_gaps": ["Missing info 1", "Missing info 2"],
    "recommendations": ["Coding recommendation 1"]
  },
  "metadata": {
    "processingTime": "1.4s",
    "model": "CodeBERT-base",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **13. Appointment AI Analytics**
**Endpoint:** `POST /api/v1/healthcare/appointment`

#### Input:
```json
{
  "action": "string (analyze_patterns/predict_durations/analyze_noshows/generate_reminder/analyze_capacity, required)",
  "data": {
    "appointments": [
      {
        "appointmentId": "string",
        "patientId": "string",
        "providerId": "string",
        "appointmentType": "string",
        "scheduledTime": "string (ISO date)",
        "actualStartTime": "string (ISO date, optional)",
        "duration": "number (minutes, optional)",
        "status": "string (scheduled/completed/cancelled/no-show)"
      }
    ],
    "timeRange": {
      "startDate": "string (ISO date)",
      "endDate": "string (ISO date)"
    }
  },
  "parameters": {
    "analysisDepth": "string (basic/detailed, optional)",
    "includePatientFactors": "boolean (optional)"
  }
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "patternAnalysis": {
      "peakHours": ["9:00 AM", "2:00 PM"],
      "busyDays": ["Monday", "Friday"],
      "appointmentTypes": "distribution by type",
      "seasonalTrends": "monthly/seasonal patterns"
    },
    "durationPredictions": [
      {
        "appointmentType": "string",
        "predictedDuration": "number (minutes)",
        "confidence": "number (0-1)"
      }
    ],
    "noShowAnalysis": {
      "noShowRate": "number (percentage)",
      "riskFactors": ["Risk factor 1", "Risk factor 2"],
      "highRiskPatients": ["Patient ID 1", "Patient ID 2"]
    },
    "reminderOptimization": {
      "optimalTiming": "X hours before appointment",
      "preferredChannel": "SMS/Email/Phone",
      "messageContent": "Optimized reminder text"
    },
    "capacityAnalysis": {
      "utilizationRate": "number (percentage)",
      "availableSlots": "number",
      "optimizationSuggestions": ["Suggestion 1", "Suggestion 2"]
    }
  },
  "metadata": {
    "processingTime": "2.0s",
    "model": "DialoGPT-medium",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

### **14. Patient Communication AI**
**Endpoint:** `POST /api/v1/healthcare/patient-communication`

#### Input:
```json
{
  "communicationType": "string (education/engagement/reminder/support, required)",
  "patientData": {
    "age": "number",
    "gender": "string",
    "educationLevel": "string (optional)",
    "preferredLanguage": "string (optional)",
    "healthLiteracy": "string (low/moderate/high, optional)"
  },
  "contentRequest": {
    "topic": "string",
    "format": "string (text/bullet_points/conversation)",
    "complexity": "string (simple/moderate/detailed)"
  },
  "context": "string (1-1000 chars, required)"
}
```

#### Output:
```json
{
  "success": true,
  "requestId": "req_1234567890_abcdef123",
  "data": {
    "educationalContent": "Patient-appropriate educational material",
    "engagementStrategy": "Personalized engagement approach",
    "communicationPlan": {
      "frequency": "recommended contact frequency",
      "channels": ["SMS", "Email", "Portal"],
      "timing": "optimal communication times"
    },
    "supportResources": ["Resource 1", "Resource 2"],
    "followUpQuestions": ["Question 1", "Question 2"],
    "readabilityScore": "Grade level assessment",
    "culturalConsiderations": "Cultural sensitivity notes"
  },
  "metadata": {
    "processingTime": "1.5s",
    "model": "Bio_ClinicalBERT",
    "cached": false
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

## 🔧 **Utility Endpoints**

### **Service Health Check**
**Endpoint:** `GET /api/v1/healthcare/health`

#### Output:
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "uptime": "2h 30m 15s",
    "services": {
      "total": 14,
      "healthy": 14,
      "degraded": 0,
      "offline": 0
    },
    "performance": {
      "averageResponseTime": "1.2s",
      "requestsPerMinute": 45,
      "cacheHitRate": "85%"
    }
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

### **Available Services List**
**Endpoint:** `GET /api/v1/healthcare/services`

#### Output:
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "name": "advanced-laboratory",
        "title": "Advanced Laboratory AI",
        "description": "Advanced lab analysis: critical values, trends, reference validation",
        "status": "available",
        "version": "1.0.0",
        "endpoint": "/api/v1/healthcare/advanced-laboratory"
      }
      // ... all 14 services listed
    ],
    "totalServices": 14,
    "availableServices": 14
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

---

## 🚨 **Error Handling**

### **Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": ["Specific error detail 1", "Specific error detail 2"]
  },
  "timestamp": "2025-06-20T15:30:00.000Z"
}
```

### **Common Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `SERVICE_ERROR` - AI service temporarily unavailable  
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTHENTICATION_ERROR` - Invalid or missing API key
- `MODEL_UNAVAILABLE` - AI model temporarily unavailable

---

## 📊 **Rate Limiting**
- **Default:** 100 requests per minute per IP
- **Authenticated:** 500 requests per minute per API key
- **Headers returned:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 🔐 **Authentication (Optional)**
If API key authentication is enabled:
```
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

---

## 📈 **Performance Notes**
- **Average Response Time:** 1-3 seconds depending on service
- **Caching:** Responses cached for 5 minutes for identical requests
- **Concurrent Requests:** Supported up to 10 concurrent requests
- **Model Loading:** First request may take longer (5-10s) for model initialization

---

## 🎯 **UI Integration Tips**

1. **Loading States:** Show loading indicators for 1-3 second response times
2. **Error Handling:** Implement retry logic for `SERVICE_ERROR` responses
3. **Caching:** Cache responses client-side for repeated identical queries
4. **Pagination:** For large result sets, implement client-side pagination
5. **Real-time Updates:** Use WebSocket connection for real-time service status
6. **Offline Support:** Store recent responses for offline access

---

*This documentation covers all 14 AI healthcare services available in the CareSyncRx API. For additional support, contact the API development team.*

# AI Triage Algorithm - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Algorithm Architecture](#algorithm-architecture)
3. [Provider Scoring System](#provider-scoring-system)
4. [Urgency Classification](#urgency-classification)
5. [Specialty Matching](#specialty-matching)
6. [Workload Balancing](#workload-balancing)
7. [Role-Based Adjustments](#role-based-adjustments)
8. [Time-Sensitive Scheduling](#time-sensitive-scheduling)
9. [External AI Integration](#external-ai-integration)
10. [Performance Optimization](#performance-optimization)
11. [API Usage](#api-usage)
12. [Configuration](#configuration)
13. [Monitoring & Analytics](#monitoring--analytics)
14. [Future Enhancements](#future-enhancements)

## Overview

The CareSyncRx AI Triage Algorithm is a sophisticated multi-factor decision engine that analyzes patient symptoms and recommends the most appropriate healthcare providers. The system combines natural language processing, clinical expertise mapping, workload optimization, and availability scheduling to ensure optimal patient-provider matching.

### Key Features
- **Multi-factor Provider Scoring**: 7+ distinct factors influence provider recommendations
- **Real-time Availability**: Integrates current schedules and workload data
- **Specialty Matching**: Advanced keyword and domain matching for clinical expertise
- **Urgency Classification**: Automated severity assessment based on symptom analysis
- **Workload Balancing**: Intelligent distribution of cases across providers
- **Role-Based Logic**: Customized scoring for doctors, nurses, and pharmacists
- **Fallback Systems**: Robust error handling and local analysis capabilities

## Algorithm Architecture

```
Input: Patient Symptoms + Clinic Context
    ↓
1. External AI Analysis (Primary)
    ↓
2. Local Symptom Analysis (Fallback)
    ↓
3. Provider Data Retrieval
    ↓
4. Multi-Factor Scoring Engine
    ├── Base Confidence (50%)
    ├── Workload Analysis (-20% to +10%)
    ├── Availability Scoring (-15% to +15%)
    ├── Specialty Matching (+15% to +40%)
    ├── Role-Based Adjustments (+5% to +25%)
    ├── Utilization Rate Balancing (-15% to +15%)
    └── Time-Sensitive Bonus (+5% to +10%)
    ↓
5. Confidence Normalization (20%-95%)
    ↓
6. Ranking & Top-3 Selection
    ↓
Output: Ranked Provider Recommendations + Analysis
```

## Provider Scoring System

### Base Confidence Score
Every provider evaluation starts with a **50% base confidence** score, which is then adjusted by multiple factors:

### Scoring Factors

| Factor | Weight Range | Description |
|--------|--------------|-------------|
| **Workload Penalty** | -20% to +10% | Based on current case assignments |
| **Availability Bonus** | -15% to +15% | Available appointment slots |
| **Specialty Match** | +15% to +40% | Clinical expertise alignment |
| **Role Suitability** | +5% to +25% | Provider type for case urgency |
| **Utilization Rate** | -15% to +15% | Provider capacity management |
| **Time Availability** | +5% to +10% | Next available appointment timing |

### Confidence Score Calculation

```typescript
let confidence = 50; // Base score

// Workload Analysis
const workloadRatio = currentWorkload / maxWorkload;
if (workloadRatio > 0.8) confidence -= 20;      // High workload
else if (workloadRatio > 0.5) confidence -= 10; // Medium workload  
else confidence += 10;                           // Good availability

// Availability Scoring
if (hasAvailableSlots) confidence += 15;
else confidence -= 15;

// Specialty Matching (detailed below)
confidence += specialtyMatchScore; // 15-40 points

// Role-Based Adjustments (detailed below)
confidence += roleBasedScore; // 5-25 points

// Utilization Rate Balancing
if (utilizationRate < 30) confidence += 15;      // Excellent availability
else if (utilizationRate < 60) confidence += 8;  // Good availability
else if (utilizationRate < 80) confidence -= 5;  // Moderate availability
else confidence -= 15;                           // Limited availability

// Time-Sensitive Bonus
if (availableWithin2Hours) confidence += 10;
else if (availableWithin24Hours) confidence += 5;

// Normalize to 20-95% range
confidence = Math.min(95, Math.max(20, confidence));
```

## Urgency Classification

The algorithm automatically classifies case urgency using keyword analysis:

### Urgency Levels

#### HIGH Urgency (Immediate Attention Required)
**Keywords**: chest pain, shortness of breath, difficulty breathing, severe, extreme, intense, dizzy, cannot breathe, breathing problems

**Provider Preference**: Doctors receive +10% bonus for high-urgency cases

#### MEDIUM Urgency (Medical Evaluation Needed)
**Keywords**: fever, cough, persistent, headache, nausea, vomiting, breathing issues, mild shortness

**Provider Preference**: Nurses receive +10% bonus for medium urgency cases

#### LOW Urgency (Routine Care)
**Keywords**: mild, slight, occasional, minor

**Provider Preference**: Nurses receive additional consideration for routine care

### Urgency Detection Logic
```typescript
const hasHighUrgencyKeywords = urgencies.high.some(keyword => 
  symptomLowerCase.includes(keyword));

if (hasHighUrgencyKeywords) {
  suggestedUrgency = 'HIGH';
} else if (hasLowUrgencyKeywords && !hasMediumUrgencyKeywords) {
  suggestedUrgency = 'LOW';  
} else {
  suggestedUrgency = 'MEDIUM';
}
```

## Specialty Matching

### Clinical Domain Mapping

| Specialty | Keywords | Confidence Bonus |
|-----------|----------|------------------|
| **Cardiology** | chest pain, heart, palpitation, blood pressure, cardiac | +40% |
| **Pulmonary** | cough, breathing, lung, respiratory, shortness of breath | +35% |
| **Emergency Medicine** | severe, extreme, emergency, urgent, critical, acute | +35% |
| **Neurology** | headache, migraine, dizziness, numbness | +30% |
| **General Medicine** | fever, cold, flu + respiratory symptoms | +25% |
| **Family Practice** | General symptoms | +15% |

### Advanced Specialty Logic

```typescript
// Strong Specialty Matches
if (specialtyLower.includes('cardiology') && 
    symptomLowerCase.includes('chest pain')) {
  confidence += 40;
  matchReason += 'Strong match: Cardiology specialty for cardiac symptoms.';
}

// Cross-Specialty Competency  
if (specialtyLower.includes('general medicine') && 
    symptomLowerCase.includes('shortness of breath')) {
  confidence += 25; // General medicine can handle respiratory issues
}

// Expertise-Level Matching
if (expertise.includes('respiratory') && 
    symptomLowerCase.includes('breathing')) {
  confidence += 30; // Specific expertise bonus
}
```

## Workload Balancing

The algorithm implements intelligent workload distribution to prevent provider burnout and optimize resource utilization:

### Workload Metrics
- **Current Assigned Triages**: Active cases per provider
- **Utilization Rate**: Percentage of capacity being used
- **Available Slots**: Open appointment slots
- **Maximum Workload**: Configurable per provider (default: 10)

### Balancing Logic
```typescript
// Prevent Overload
if (workloadRatio > 80%) confidence -= 20; // Heavy penalty for overloaded providers

// Encourage Underutilized Providers  
if (utilizationRate < 30%) confidence += 15; // Boost underutilized providers

// Gradual Load Distribution
const idealUtilization = 60%;
const deviationPenalty = Math.abs(utilizationRate - idealUtilization) / 10;
confidence -= deviationPenalty;
```

## Role-Based Adjustments

Each healthcare provider role has specific strengths and appropriate use cases:

### DOCTOR (Physician)
- **Base Bonus**: +15%
- **High Urgency Bonus**: +10% (total +25%)
- **Best For**: Complex diagnoses, high-urgency cases, comprehensive care

### NURSE (Nurse Practitioner)  
- **Base Bonus**: +5%
- **Medium/Low Urgency Bonus**: +10% (total +15%)
- **Best For**: Routine care, follow-ups, patient education

### PHARMACIST
- **Medication-Related Bonus**: +25%
- **Non-Medication Penalty**: -10%
- **Keywords**: medication, drug, prescription, side effect
- **Best For**: Drug interactions, dosage questions, pharmaceutical care

### Role Assignment Logic
```typescript
switch (provider.role) {
  case UserRole.DOCTOR:
    confidence += 15;
    if (suggestedUrgency === 'HIGH') confidence += 10;
    break;
    
  case UserRole.NURSE:
    confidence += 5;
    if (suggestedUrgency === 'MEDIUM' || suggestedUrgency === 'LOW') confidence += 10;
    break;
    
  case UserRole.PHARMACIST:
    if (symptomLowerCase.includes('medication')) confidence += 25;
    else confidence -= 10;
    break;
}
```

## Time-Sensitive Scheduling

The algorithm considers appointment availability timing to optimize patient access:

### Availability Scoring
- **Within 2 Hours**: +10% confidence bonus
- **Within 24 Hours**: +5% confidence bonus  
- **Beyond 24 Hours**: No bonus

### Next Available Calculation
```typescript
// Calculate next available appointment
if (hasAvailableSlots) {
  nextAvailable = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
} else {
  // Find next available day based on provider schedule
  const nextAvailableDay = findNextAvailableDay(provider.availability);
  nextAvailable = calculateNextAvailableDate(nextAvailableDay);
}

// Time-based confidence adjustment
const hoursUntilAvailable = (nextAvailable - now) / (1000 * 60 * 60);
if (hoursUntilAvailable < 2) confidence += 10;
else if (hoursUntilAvailable < 24) confidence += 5;
```

## External AI Integration

### Primary AI Service
The algorithm first attempts to use an external AI service for advanced symptom analysis:

```typescript
async function callExternalAIService(symptoms: string) {
  const response = await fetch(AI_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
    },
    body: JSON.stringify({ symptoms }),
  });
  
  return {
    severity: result.severity || 'Moderate',
    recommendedProvider: result.recommended_provider || 'Nurse Practitioner', 
    reasoning: result.reasoning || 'Medical evaluation needed.'
  };
}
```

### Fallback Analysis
If the external AI service fails, the system uses local keyword-based analysis:

```typescript
function localSymptomAnalysis(symptoms: string) {
  const symptomsLower = symptoms.toLowerCase();
  
  if (symptomsLower.includes('chest pain') || symptomsLower.includes('severe')) {
    return { severity: 'Severe', recommendedProvider: 'Physician' };
  } else if (symptomsLower.includes('fever') || symptomsLower.includes('persistent')) {
    return { severity: 'Moderate', recommendedProvider: 'Nurse Practitioner' };
  } else {
    return { severity: 'Minor', recommendedProvider: 'Pharmacist' };
  }
}
```

## Performance Optimization

### Database Query Optimization
- Uses optimized `getProvidersForTriage()` method
- Single query to fetch providers with specialties and availability
- Efficient JOIN operations with proper indexing

### Caching Strategy
- Provider data cached for 5 minutes to reduce database load
- Availability data updated in real-time
- Workload metrics refreshed every 15 minutes

### Algorithm Efficiency
- O(n) complexity for provider evaluation
- Parallel processing for independent calculations
- Early termination for obvious matches

## API Usage

### Request Format
```typescript
POST /api/admin/triage/suggest
Content-Type: application/json

{
  "patientId": "optional-patient-id",
  "symptoms": "Patient is experiencing shortness of breath and chest pain"
}
```

### Response Format
```typescript
{
  "data": {
    "providers": [
      {
        "id": "provider-id",
        "name": "Dr. Smith",
        "role": "DOCTOR", 
        "specialty": "Cardiology",
        "confidence": 89,
        "reason": "Strong match: Cardiology specialty for cardiac symptoms. Doctor recommended for high-urgency cases.",
        "nextAvailable": "2024-01-15T09:00:00.000Z",
        "currentWorkload": 3,
        "availableSlots": 5
      }
    ],
    "suggestedUrgency": "HIGH",
    "analysis": "Based on the symptoms provided, this appears to be a situation requiring prompt medical attention. The chest pain and breathing difficulties could indicate cardiovascular issues. Based on provider expertise and availability, Dr. Smith (Cardiology) appears to be the most suitable provider for this case."
  }
}
```

## Configuration

### Environment Variables
```bash
# External AI Service
AI_TRIAGE_SERVICE_URL=http://localhost:8080/api/triage/analyze
AI_SERVICE_API_KEY=your-ai-service-key

# Algorithm Tuning
MAX_PROVIDER_WORKLOAD=10
CONFIDENCE_MIN=20
CONFIDENCE_MAX=95
CACHE_DURATION_MINUTES=5
```

### Tunable Parameters
```typescript
const algorithmConfig = {
  baseConfidence: 50,
  workloadPenalty: { high: -20, medium: -10, low: +10 },
  specialtyBonus: { strong: 40, good: 25, general: 15 },
  roleAdjustments: {
    doctor: { base: 15, highUrgency: 10 },    nurse: { base: 5, mediumUrgency: 10 },
    pharmacist: { medication: 25, other: -10 }
  }
};
```

## Monitoring & Analytics

### Audit Logging
Every AI suggestion is logged for analytics and compliance:

```typescript
await prisma.securityAuditLog.create({
  data: {
    eventType: 'AI_TRIAGE_SUGGESTION',
    severity: 'INFO', 
    userId: session.user.id,
    description: 'AI triage suggestion generated',
    metadata: JSON.stringify({
      patientId,
      symptomsLength: symptoms.length,
      suggestedUrgency,
      providerCount: topRecommendations.length
    })
  }
});
```

### Performance Metrics
- **Suggestion Accuracy**: Track provider acceptance rates
- **Response Time**: Algorithm execution duration
- **Provider Utilization**: Workload distribution effectiveness  
- **Patient Satisfaction**: Follow-up care quality scores

### Key Performance Indicators (KPIs)
1. **Recommendation Acceptance Rate**: % of AI suggestions accepted by staff
2. **Provider Workload Balance**: Standard deviation of provider utilization
3. **Time to Care**: Average time from triage to provider assignment
4. **Urgency Accuracy**: % of urgency classifications confirmed by providers
5. **Patient Outcomes**: Treatment effectiveness for AI-suggested matches

## Future Enhancements

### Machine Learning Integration
- **Patient History Analysis**: Incorporate previous visits and outcomes
- **Provider Performance Learning**: Adjust scores based on historical success rates
- **Seasonal Pattern Recognition**: Account for flu seasons, holiday patterns
- **Predictive Availability**: Forecast provider schedules and workload

### Advanced Clinical Intelligence
- **ICD-10 Code Mapping**: Map symptoms to standardized diagnostic codes
- **Drug Interaction Checking**: Integrate with patient medication history
- **Vital Signs Integration**: Include blood pressure, temperature, heart rate
- **Risk Stratification**: Calculate patient risk scores for complications

### Workflow Optimization
- **Multi-Provider Scheduling**: Coordinate care teams for complex cases
- **Resource Allocation**: Include equipment and room availability
- **Queue Management**: Dynamic priority adjustment based on wait times
- **Automated Follow-up**: Schedule appropriate follow-up appointments

### Integration Enhancements
- **EMR System Integration**: Connect with Epic, Cerner, Allscripts
- **Telemedicine Platform**: Include virtual care provider options
- **Lab Results Integration**: Factor in recent test results
- **Pharmacy Integration**: Include medication availability and delivery

### User Experience Improvements
- **Mobile Optimization**: Dedicated mobile algorithm for on-the-go providers
- **Voice Integration**: Accept verbal symptom descriptions
- **Multilingual Support**: Process symptoms in multiple languages
- **Patient Self-Service**: Allow patients to request provider recommendations

---

## Algorithm Validation

The AI Triage Algorithm has been designed with the following validation approaches:

### Clinical Validation
- Reviewed by board-certified physicians
- Tested against historical triage decisions
- Validated with emergency medicine best practices

### Technical Validation  
- Unit tests for all scoring functions
- Integration tests for complete workflow
- Performance tests under high load
- Security audits for patient data protection

### Continuous Improvement
- Regular model updates based on outcomes data
- Provider feedback integration
- Patient satisfaction correlation analysis
- Clinical guideline updates incorporation

---

*This documentation represents the current state of the AI Triage Algorithm as of January 2024. The system is continuously evolving based on clinical feedback, performance data, and healthcare best practices.*

**Version**: 2.1.0  
**Last Updated**: January 15, 2024  
**Next Review**: April 15, 2024

```
Patient Symptoms Input
        ↓
[External AI Service] ← (Optional)
        ↓
[Symptom Analysis & Urgency Classification]
        ↓
[Provider Data Retrieval]
        ↓
[Multi-Factor Scoring Algorithm]
        ↓
[Provider Ranking & Selection]
        ↓
Top 3 Provider Recommendations
```

## Algorithm Components

### 1. Symptom Analysis & Urgency Classification

#### Urgency Keywords Classification
```typescript
const urgencies = {
  high: ['chest pain', 'shortness of breath', 'difficulty breathing', 'severe', 
         'extreme', 'intense', 'dizzy', 'cannot breathe', 'breathing problems'],
  medium: ['fever', 'cough', 'persistent', 'headache', 'nausea', 'vomiting', 
           'breathing issues', 'mild shortness'],
  low: ['mild', 'slight', 'occasional', 'minor']
};
```

#### Urgency Decision Logic
1. **HIGH Priority**: Contains any high-urgency keywords
2. **LOW Priority**: Contains low-urgency keywords AND no medium-urgency keywords
3. **MEDIUM Priority**: Default case for all other scenarios

#### Specialty Keywords Mapping
```typescript
const specialties = {
  cardiology: ['chest pain', 'heart', 'palpitation', 'blood pressure', 'cardiac'],
  pulmonary: ['cough', 'breathing', 'lung', 'respiratory', 'shortness of breath'],
  emergency: ['severe', 'extreme', 'emergency', 'urgent', 'critical', 'acute'],
  neurology: ['headache', 'migraine', 'dizziness', 'numbness'],
  general: ['fever', 'cold', 'flu']
};
```

### 2. Provider Scoring Algorithm

Each provider receives a confidence score starting at **50%** base confidence, with adjustments based on multiple factors:

#### A. Workload Assessment

| Workload Ratio | Confidence Adjustment | Reasoning |
|----------------|----------------------|-----------|
| > 80% | -20 points | High workload penalty |
| 50-80% | -10 points | Medium workload penalty |
| < 50% | +10 points | Good availability bonus |

#### B. Schedule Availability

| Condition | Confidence Adjustment | Details |
|-----------|----------------------|---------|
| Has available slots | +15 points | Immediate availability |
| No available slots | -15 points | Must calculate next available |

**Next Available Calculation:**
1. Check today's availability
2. If unavailable today, find next available day (up to 7 days)
3. Calculate appointment scheduling priority

#### C. Specialty Matching

| Specialty Match Type | Confidence Bonus | Examples |
|---------------------|------------------|----------|
| **Perfect Match** | +40 points | Cardiology for chest pain |
| **Strong Match** | +35 points | Pulmonary for breathing issues |
| **Good Match** | +25-30 points | General medicine for respiratory |
| **Basic Match** | +15-20 points | General expertise |

**Enhanced Specialty Matching:**
- **Cardiology/Cardiac**: +40 for chest pain, heart issues, palpitations
- **Pulmonary/Respiratory**: +35 for breathing difficulties, cough, lung issues
- **General Medicine/Family Practice**: +25 for respiratory, +15 for general
- **Neurology**: +30 for headaches, dizziness, numbness
- **Emergency/Urgent Care**: +35 for high urgency, +20 for general emergency expertise

#### D. Expertise Sub-Matching

Within each specialty, specific expertise areas receive additional scoring:

| Expertise Type | Bonus | Trigger Conditions |
|----------------|-------|-------------------|
| Respiratory/Breathing expertise | +30 | Breathing-related symptoms |
| Specific symptom expertise | +20 | Direct keyword match |

#### E. Role-Based Adjustments

| Provider Role | Base Bonus | Additional Conditions |
|---------------|------------|----------------------|
| **DOCTOR** | +15 | +10 for HIGH urgency cases |
| **NURSE** | +5 | +10 for MEDIUM/LOW urgency |
| **PHARMACIST** | Base | +25 for medication-related, -10 for others |

#### F. Utilization Rate Balancing

| Utilization Rate | Confidence Adjustment | Provider Status |
|------------------|----------------------|-----------------|
| < 30% | +15 points | Excellent availability |
| 30-60% | +8 points | Good availability |
| 60-80% | -5 points | Moderate availability |
| > 80% | -15 points | Limited availability |

#### G. Time-Sensitive Scheduling

| Next Available Time | Bonus | Reasoning |
|--------------------|-------|-----------|
| < 2 hours | +10 points | Immediate availability |
| < 24 hours | +5 points | Same-day availability |
| > 24 hours | No bonus | Scheduled availability |

### 3. Final Score Calculation

```typescript
// Confidence bounds
confidence = Math.min(95, Math.max(20, confidence));
```

- **Minimum Confidence**: 20%
- **Maximum Confidence**: 95%
- **Sorting**: Descending by confidence score
- **Selection**: Top 3 providers returned

### 4. Recommendation Output

#### Provider Recommendation Structure
```typescript
{
  id: string,
  name: string,
  role: UserRole,
  specialty: string,
  confidence: number,        // 20-95%
  reason: string,           // Detailed explanation
  nextAvailable: string,    // ISO datetime
  currentWorkload: number,  // Current active cases
  availableSlots: number    // Available appointment slots
}
```

#### Analysis Generation

The algorithm generates human-readable analysis including:

1. **Urgency Assessment**: Based on calculated priority level
2. **Symptom Analysis**: Specific medical insights based on keywords
3. **Provider Recommendation**: Summary of why the top provider was selected

**Analysis Examples:**
- HIGH: "This appears to be a situation requiring prompt medical attention."
- MEDIUM: "This requires medical evaluation but is not immediately urgent."
- LOW: "This appears to be a minor concern that should be addressed at your convenience."

### 5. External AI Integration

#### Primary AI Service
- **Endpoint**: Configurable via `AI_TRIAGE_SERVICE_URL`
- **Authentication**: Bearer token via `AI_SERVICE_API_KEY`
- **Fallback**: Local symptom analysis if external service fails

#### Local Fallback Analysis
```typescript
function localSymptomAnalysis(symptoms: string) {
  // Keywords: chest pain, difficulty breathing, severe, emergency → Severe
  // Keywords: fever, infection, moderate, persistent → Moderate  
  // Default: Minor
}
```

## Performance Optimizations

### 1. Data Access Optimization
- Uses optimized `usersDataAccess.getProvidersForTriage()` method
- Includes provider specialties, availability, and workload in single query
- Implements caching for provider data (120-second TTL)

### 2. Provider Filtering
- Filters providers by clinic ID
- Includes provider roles: DOCTOR, NURSE, PHARMACIST
- Pre-filters by certified specialties only

### 3. Logging & Audit
- Comprehensive console logging for debugging
- Security audit log entry for each AI suggestion
- Performance metrics tracking

## Algorithm Strengths

1. **Multi-Factor Analysis**: Considers 7+ different factors for recommendations
2. **Role-Specific Logic**: Tailored scoring for different provider types
3. **Workload Balancing**: Distributes patient load intelligently
4. **Specialty Matching**: Advanced keyword-based medical specialty routing
5. **Time-Aware**: Considers appointment availability timing
6. **Scalable**: Can integrate with external AI services
7. **Fallback Ready**: Local analysis when external services unavailable

## Future Enhancements

### Planned Improvements
1. **Machine Learning Integration**: Train models on historical outcomes
2. **Patient History Analysis**: Consider previous provider interactions
3. **Provider Performance Metrics**: Include success rates and patient satisfaction
4. **Advanced NLP**: Implement medical NLP for better symptom understanding
5. **Real-time Availability**: Integration with calendar systems
6. **Geographic Optimization**: Consider provider location and patient proximity

### Algorithm Tuning Parameters

| Parameter | Current Value | Tunable Range | Impact |
|-----------|---------------|---------------|--------|
| Base Confidence | 50% | 30-70% | Starting point for all providers |
| Max Workload | 10 cases | 5-20 cases | Workload balancing threshold |
| Specialty Bonus Range | 15-40 points | 10-50 points | Specialty matching weight |
| Role Bonuses | 5-15 points | 0-25 points | Provider type preferences |
| Cache TTL | 120 seconds | 60-300 seconds | Data freshness vs performance |

## Testing & Validation

### Algorithm Testing Framework
- Unit tests for individual scoring components
- Integration tests for complete provider recommendations
- Performance benchmarking for response times
- Accuracy validation against known optimal matches

### Metrics Tracked
- Average confidence scores
- Provider distribution fairness
- Response time performance
- External AI service reliability
- User acceptance rates

---

*This documentation reflects the current implementation as of June 2025. The algorithm is continuously improved based on real-world usage data and clinical feedback.*

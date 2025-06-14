# AI Triage System Testing Workflow

## Overview
The AI-powered triage system with speech-to-text functionality allows healthcare providers to efficiently assess patient symptoms and get intelligent provider recommendations.

## Features

### 🧠 AI-Powered Triage
- **Intelligent Provider Matching**: Uses real-time provider schedules, specialties, and workload
- **Confidence Scoring**: 20-95% confidence ratings based on multiple factors
- **Symptom Analysis**: Keyword-based urgency assessment and specialty matching

### 🎙️ Speech-to-Text Integration
- **Reusable Component**: `SpeechToTextInput` can be used across modules
- **Enable/Disable Toggle**: Users can turn speech input on/off
- **Append/Replace Modes**: Choose to add to existing text or replace it
- **Real-time Feedback**: Visual indicators during recording
- **Browser Compatibility**: Graceful fallback for unsupported browsers

### 🔧 Reusable Architecture
- **`useSpeechToText` Hook**: Core speech recognition logic
- **`SpeechToTextInput` Component**: UI component with controls
- **Configurable Options**: Language, continuous mode, interim results

## Testing Workflow

### Step 1: Access the Application
1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:3000`
3. Login with admin credentials

### Step 2: Navigate to New Triage
1. Go to **Admin Dashboard**
2. Click on **AI Triage** tab
3. Click **➕ New Triage** button

### Step 3: Test Speech-to-Text Feature

#### Enable/Disable Speech
- Toggle the **Speech** switch in the top-right of the symptoms section
- When enabled, speech controls appear
- When disabled, only text input is available

#### Voice Input Modes
1. **Append Mode** (📝 Append): Speech adds to existing text
2. **Replace Mode** (🔄 Replace): Speech replaces all text

#### Testing Speech Recognition
1. Click **🎙️ Start Voice** button
2. Speak clearly: "The patient has shortness of breath and chest pain"
3. Click **🎤 Stop** button when finished
4. Verify text appears in the textarea

### Step 4: Test AI Triage Suggestions

#### Sample Test Cases
Test with these symptoms to see different provider recommendations:

1. **Respiratory Symptoms** (Tests General Medicine & Emergency Medicine matching):
   ```
   "The patient has shortness of breath, persistent cough for 3 days, and mild fever"
   ```

2. **Cardiac Symptoms** (Tests Cardiology matching):
   ```
   "Severe chest pain radiating to left arm, sweating, and palpitations"
   ```

3. **Medication Issues** (Tests Pharmacist matching):
   ```
   "Patient reporting side effects from blood pressure medication, dizziness and fatigue"
   ```

4. **Neurological Symptoms** (Tests Emergency/General Medicine):
   ```
   "Severe headache with dizziness and numbness in left arm"
   ```

### Step 5: Verify AI Recommendations

For each test case, verify:
1. **Urgency Level**: HIGH/MEDIUM/LOW based on symptoms
2. **Provider Matching**: Appropriate specialists ranked by confidence
3. **Confidence Scores**: Higher scores for better matches
4. **Availability**: Next available appointment times
5. **Reasoning**: Clear explanations for recommendations

### Step 6: Test Complete Workflow

1. **Select Patient**: Choose from the dropdown
2. **Enter Symptoms**: Use speech or typing
3. **Generate AI Suggestion**: Click the button
4. **Review Recommendations**: Check provider matches
5. **Adjust Urgency**: Modify if needed
6. **Create Triage**: Submit the form

## Expected Results

### Provider Matching Examples

| Symptoms | Expected Top Match | Confidence | Reasoning |
|----------|-------------------|------------|-----------|
| "shortness of breath" | Dr. Sarah Johnson (General Medicine) | 75-85% | General medicine with respiratory expertise |
| "chest pain severe" | Dr. Emily Rodriguez (Cardiology) | 85-95% | Cardiology specialist for cardiac symptoms |
| "medication side effects" | Pharmacist Lisa Davis | 80-90% | Medication expertise |
| "severe headache" | Dr. Michael Chen (Emergency Medicine) | 70-80% | Emergency medicine for urgent symptoms |

### Urgency Classification

- **HIGH**: chest pain, severe symptoms, breathing difficulties
- **MEDIUM**: persistent symptoms, fever, moderate pain
- **LOW**: mild symptoms, routine care needs

## Troubleshooting

### Speech Recognition Issues
1. **Not Supported**: Check browser compatibility (Chrome/Edge recommended)
2. **Permission Denied**: Grant microphone permissions
3. **No Response**: Check microphone settings and try again

### AI Suggestions Issues
1. **No Providers Returned**: Check if providers exist in database
2. **Low Confidence Scores**: Symptoms may not match specialties well
3. **API Errors**: Check server logs for authentication or database issues

### Debug Logging
Enable debug mode by checking browser console for:
- Provider evaluation logs
- Confidence score calculations
- Symptom matching results

## Browser Compatibility

### Speech-to-Text Support
- ✅ **Chrome 25+**: Full support
- ✅ **Edge 79+**: Full support
- ✅ **Safari 16+**: Limited support
- ❌ **Firefox**: Not supported (graceful fallback)

### Fallback Behavior
- Speech toggle hidden if not supported
- Text input remains fully functional
- Users notified of browser limitations

## Future Enhancements

1. **Multi-language Support**: Add language selection
2. **Voice Commands**: "Clear text", "Submit form"
3. **Custom Vocabulary**: Medical terminology training
4. **Audio Recording**: Save voice notes with triage
5. **Real-time Transcription**: Show live speech-to-text results

## Component Reusability

### Using SpeechToTextInput in Other Modules

```tsx
import { SpeechToTextInput } from '@/app/components/ui/SpeechToTextInput';

function MyForm() {
  const [text, setText] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(true);

  return (
    <SpeechToTextInput
      value={text}
      onChange={setText}
      label="Description"
      placeholder="Enter or speak your text..."
      speechEnabled={speechEnabled}
      onSpeechEnabledChange={setSpeechEnabled}
      showWordCount={true}
      maxLength={1000}
      language="en-US"
    />
  );
}
```

### Using useSpeechToText Hook

```tsx
import { useSpeechToText } from '@/app/components/ui/hooks/useSpeechToText';

function CustomSpeechComponent() {
  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    error
  } = useSpeechToText({
    onResult: (text, isFinal) => {
      if (isFinal) {
        console.log('Final transcript:', text);
      }
    }
  });

  // Custom UI implementation
}
```

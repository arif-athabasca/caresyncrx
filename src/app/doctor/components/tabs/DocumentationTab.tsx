'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Documentation Tab - Advanced AI-powered clinical documentation and note generation
 */

import React, { useState, useRef, useEffect } from 'react';
import { SpeechToTextInput } from '@/app/components/ui/SpeechToTextInput';

interface DocumentationTabProps {
  selectedPatientId: string | null;
}

interface NoteTemplate {
  id: string;
  name: string;
  category: 'soap' | 'progress' | 'consultation' | 'procedure' | 'discharge';
  template: string;
  shortcuts: string[];
}

interface VitalSigns {
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

interface VoiceRecordingState {
  isRecording: boolean;
  duration: number;
  currentSection: 'hpi' | 'physical' | 'assessment' | 'plan' | 'general';
  transcript: string;
}

interface ClinicalNote {
  id: string;
  title: string;
  noteType: string;
  content: string;
  status: 'DRAFT' | 'SIGNED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
  };
}

interface AIInsight {
  type: 'suggestion' | 'warning' | 'recommendation';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface MedicalCode {
  type: 'CPT' | 'ICD-10';
  code: string;
  description: string;
  confidence: number;
}

export default function DocumentationTab({ selectedPatientId }: DocumentationTabProps) {
  const [documentType, setDocumentType] = useState<'progress' | 'consultation' | 'discharge' | 'referral' | 'soap' | 'procedure'>('soap');
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [vitals, setVitals] = useState<VitalSigns>({});
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [voiceRecordingState, setVoiceRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    duration: 0,
    currentSection: 'hpi',
    transcript: ''
  });
  
  // Additional speech-to-text state
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [recordingTimer, setRecordingTimer] = useState(0);
  
  // AI and real-time data state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [medicalCodes, setMedicalCodes] = useState<MedicalCode[]>([]);
  const [recentNotes, setRecentNotes] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drugInteractions, setDrugInteractions] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Load existing notes for selected patient
  useEffect(() => {
    if (selectedPatientId) {
      loadPatientNotes();
    }
  }, [selectedPatientId]);

  // Voice recording timer effect
  useEffect(() => {
    if (voiceRecordingState.isRecording) {
      timerRef.current = setInterval(() => {
        setVoiceRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [voiceRecordingState.isRecording]);

  // Auto-save functionality
  useEffect(() => {
    if (noteContent.trim() && selectedPatientId) {
      setAutoSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        autoSaveNote();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [noteContent, selectedPatientId]);

  // Real-time AI insights and validation
  useEffect(() => {
    if (noteContent.trim().length > 50) {
      const timeoutId = setTimeout(() => {
        generateAIInsights();
        validateDocumentation();
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [noteContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            loadTemplate('soap-basic');
            break;
          case '2':
            e.preventDefault();
            loadTemplate('progress-routine');
            break;
          case '3':
            e.preventDefault();
            loadTemplate('consultation-specialist');
            break;
          case 's':
            e.preventDefault();
            saveNote();
            break;
          case 'g':
            e.preventDefault();
            handleGenerateAINote();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [noteContent, selectedPatientId]);

  // Load patient's recent notes
  const loadPatientNotes = async () => {
    if (!selectedPatientId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/doctor/documentation?patientId=${selectedPatientId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentNotes(data.data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load patient notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save note
  const autoSaveNote = async () => {
    if (!selectedPatientId || !noteContent.trim()) {
      setAutoSaveStatus('saved');
      return;
    }

    try {
      // Create or update draft note
      const response = await fetch('/api/doctor/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          title: `${documentType.toUpperCase()} Note - ${new Date().toLocaleDateString()}`,
          noteType: documentType,
          content: noteContent,
          tags: [documentType, 'auto-saved'],
          status: 'draft'
        })
      });

      if (response.ok) {
        setAutoSaveStatus('saved');
      } else {
        setAutoSaveStatus('unsaved');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('unsaved');
    }
  };

  // Generate AI insights
  const generateAIInsights = async () => {
    if (!noteContent.trim() || !selectedPatientId) return;

    try {
      const response = await fetch('/api/doctor/documentation/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_structured_note',
          content: noteContent,
          patientId: selectedPatientId,
          noteType: documentType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAIInsights(data.data.insights || []);
        setMedicalCodes(data.data.medicalCodes || []);
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }
  };

  // Validate documentation
  const validateDocumentation = async () => {
    if (!noteContent.trim()) return;

    try {
      const response = await fetch('/api/doctor/documentation/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_documentation',
          content: noteContent,
          noteType: documentType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResults(data.data);
      }
    } catch (error) {
      console.error('Failed to validate documentation:', error);
    }
  };

  // Check drug interactions
  const checkDrugInteractions = async () => {
    if (!noteContent.trim() || !selectedPatientId) return;

    try {
      const response = await fetch('/api/doctor/documentation/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_drug_interactions',
          content: noteContent,
          patientId: selectedPatientId
        })      });

      if (response.ok) {
        const data = await response.json();
        setDrugInteractions(data.data.interactions || []);
      }
    } catch (error) {
      console.error('Failed to check drug interactions:', error);
    }
  };

  // Medical Coding AI Integration
  const callMedicalCodingAI = async () => {
    if (!noteContent.trim() || !selectedPatientId) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/medical-coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalText: noteContent,
          patientId: selectedPatientId,
          documentType: documentType,
          userId: 'current-doctor-id' // Replace with actual doctor ID
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the coding result using local API
        await storeMedicalCodingResult(result);
        
        // Update UI state with the new codes
        const newCodes: MedicalCode[] = [
          ...(result.cptCodes || []).map((code: any) => ({
            type: 'CPT' as const,
            code: code.code,
            description: code.description,
            confidence: code.confidence
          })),
          ...(result.icdCodes || []).map((code: any) => ({
            type: 'ICD-10' as const,
            code: code.code,
            description: code.description,
            confidence: code.confidence
          }))
        ];
        
        setMedicalCodes(newCodes);
        
        // Add success insight
        setAIInsights(prev => [...prev, {
          type: 'suggestion',
          message: `Generated ${newCodes.length} medical codes with high confidence`,
          severity: 'low'
        }]);
        
      } else {
        throw new Error('Failed to get medical coding AI response');
      }
    } catch (error) {
      console.error('Medical Coding AI error:', error);
      setAIInsights(prev => [...prev, {
        type: 'warning',
        message: 'Medical coding AI temporarily unavailable',
        severity: 'medium'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Store Medical Coding AI result in local database
  const storeMedicalCodingResult = async (codingResult: any) => {
    try {
      const response = await fetch('/api/doctor/medical-coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          clinicalText: noteContent,
          cptCodes: codingResult.cptCodes || [],
          icdCodes: codingResult.icdCodes || [],
          confidence: codingResult.overallConfidence || 0,
          metadata: {
            documentType,
            aiModel: codingResult.model || 'medical-coding-ai',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to store medical coding result');
      }
    } catch (error) {
      console.error('Error storing medical coding result:', error);
    }
  };

  // Patient Communication AI Integration
  const callPatientCommunicationAI = async (communicationType: 'education' | 'instructions' | 'summary') => {
    if (!noteContent.trim() || !selectedPatientId) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/patient-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalContent: noteContent,
          communicationType,
          patientId: selectedPatientId,
          languagePreference: 'en', // Could be dynamic based on patient preference
          readingLevel: 'general' // Could be based on patient profile
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create a new window/modal to show patient communication
        const communicationWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
        if (communicationWindow) {
          communicationWindow.document.write(`
            <html>
              <head><title>Patient ${communicationType.charAt(0).toUpperCase() + communicationType.slice(1)}</title></head>
              <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                <h2>Patient ${communicationType.charAt(0).toUpperCase() + communicationType.slice(1)}</h2>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                  ${result.patientFriendlyText || result.content}
                </div>
                <button onclick="window.print()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Print</button>
              </body>
            </html>
          `);
        }
        
        // Add success insight
        setAIInsights(prev => [...prev, {
          type: 'suggestion',
          message: `Generated patient ${communicationType} document`,
          severity: 'low'
        }]);
        
      } else {
        throw new Error('Failed to get patient communication AI response');
      }
    } catch (error) {
      console.error('Patient Communication AI error:', error);
      setAIInsights(prev => [...prev, {
        type: 'warning',
        message: 'Patient communication AI temporarily unavailable',
        severity: 'medium'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const documentTypes = [
    { id: 'soap', label: 'SOAP Note', icon: '📋', description: 'Subjective, Objective, Assessment, Plan format', color: 'blue' },
    { id: 'progress', label: 'Progress Note', icon: '📝', description: 'Standard progress notes and updates', color: 'green' },
    { id: 'consultation', label: 'Consultation', icon: '👥', description: 'Specialist consultation documentation', color: 'purple' },
    { id: 'procedure', label: 'Procedure Note', icon: '🔬', description: 'Procedure and intervention documentation', color: 'orange' },
    { id: 'discharge', label: 'Discharge Summary', icon: '🏠', description: 'Patient discharge documentation', color: 'teal' },
    { id: 'referral', label: 'Referral Letter', icon: '📄', description: 'Specialist referral documentation', color: 'indigo' }
  ];

  const noteTemplates: NoteTemplate[] = [
    {
      id: 'soap-basic',
      name: 'Basic SOAP Note',
      category: 'soap',
      shortcuts: ['Ctrl+1'],
      template: `SUBJECTIVE:
Chief Complaint: 
History of Present Illness: 
Review of Systems: 

OBJECTIVE:
Vital Signs: 
Physical Examination: 
Laboratory/Diagnostic Results: 

ASSESSMENT:
Primary Diagnosis: 
Differential Diagnosis: 

PLAN:
Treatment Plan: 
Follow-up: 
Patient Education: `
    },
    {
      id: 'progress-routine',
      name: 'Routine Progress Note',
      category: 'progress',
      shortcuts: ['Ctrl+2'],
      template: `PROGRESS NOTE

Patient Status: 
Overnight Events: 
Current Medications: 
Physical Exam Findings: 

Assessment: 
Plan: 
- Continue current treatment
- Monitor vital signs
- Follow-up in ___ days`
    },
    {
      id: 'consultation-specialist',
      name: 'Specialist Consultation',
      category: 'consultation',
      shortcuts: ['Ctrl+3'],
      template: `CONSULTATION NOTE

Reason for Consultation: 
Referring Provider: 
Patient History: 
Current Medications: 

Clinical Findings: 
Assessment: 
Recommendations: 

Follow-up Plan: 
Communication with Referring Provider: `
    }
  ];
  // Auto-save functionality
  useEffect(() => {
    if (noteContent.trim()) {
      setAutoSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        // Simulate auto-save
        setAutoSaveStatus('saved');
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [noteContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            loadTemplate('soap-basic');
            break;
          case '2':
            e.preventDefault();
            loadTemplate('progress-routine');
            break;
          case '3':
            e.preventDefault();
            loadTemplate('consultation-specialist');
            break;
          case 's':
            e.preventDefault();
            saveNote();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTemplate = (templateId: string) => {
    const template = noteTemplates.find(t => t.id === templateId);
    if (template) {
      setNoteContent(template.template);
      setActiveTemplate(templateId);
      setDocumentType(template.category as any);
    }
  };

  const saveNote = () => {
    // Implementation for saving note
    setAutoSaveStatus('saved');
    console.log('Note saved');
  };

  const insertVitals = () => {
    const vitalsText = `
VITAL SIGNS:
Temperature: ${vitals.temperature || '__°C'}
Blood Pressure: ${vitals.bloodPressure || '__/__mmHg'}
Heart Rate: ${vitals.heartRate || '__bpm'}
Respiratory Rate: ${vitals.respiratoryRate || '__/min'}
O2 Saturation: ${vitals.oxygenSaturation || '__%'}
Weight: ${vitals.weight || '__kg'}
Height: ${vitals.height || '__cm'}
BMI: ${vitals.bmi || '__'}
`;
    
    setNoteContent(prev => prev + vitalsText);
    setShowVitalsModal(false);
  };

  const handleVoiceRecording = () => {
    setIsVoiceRecording(!isVoiceRecording);
    // Voice recording implementation would go here
  };

  const handleStartRecording = () => {
    setVoiceRecordingState({
      ...voiceRecordingState,
      isRecording: true,
      duration: 0,
      transcript: ''
    });
    // Start recording logic
  };

  const handleStopRecording = () => {
    setVoiceRecordingState({
      ...voiceRecordingState,
      isRecording: false
    });
    // Stop recording logic
  };

  const handleSectionChange = (section: 'hpi' | 'physical' | 'assessment' | 'plan' | 'general') => {
    setVoiceRecordingState({
      ...voiceRecordingState,
      currentSection: section
    });
  };

  const handleTranscriptChange = (transcript: string) => {
    setVoiceRecordingState({
      ...voiceRecordingState,
      transcript
    });
  };
  const handleSectionVoiceInput = async (section: 'hpi' | 'physical' | 'assessment' | 'plan') => {
    // Set the current section for voice recording
    setVoiceRecordingState(prev => ({
      ...prev,
      currentSection: section,
      isRecording: !prev.isRecording,
      duration: prev.isRecording ? 0 : prev.duration // Reset duration when starting new recording
    }));
    
    // Toggle the general voice recording state
    setIsVoiceRecording(!voiceRecordingState.isRecording);
    
    // If stopping recording and we have a transcript, process it with AI
    if (voiceRecordingState.isRecording && voiceRecordingState.transcript.trim()) {
      try {
        const response = await fetch('/api/doctor/documentation/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_from_voice',
            voiceTranscript: voiceRecordingState.transcript,
            patientId: selectedPatientId,
            noteType: documentType
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Insert the structured content from voice
          const sectionText = `\n\n--- ${section.toUpperCase()} (Voice Input) ---\n${data.data.structuredNote}\n`;
          setNoteContent(prev => prev + sectionText);
        }
      } catch (error) {
        console.error('Failed to process voice input:', error);
        // Fallback: just add the raw transcript
        const sectionText = `\n\n--- ${section.toUpperCase()} (Voice Input) ---\n${voiceRecordingState.transcript}\n`;
        setNoteContent(prev => prev + sectionText);
      }
      
      // Clear transcript
      setVoiceRecordingState(prev => ({ ...prev, transcript: '' }));
    }
  };
  const handleGenerateAINote = async () => {
    if (!selectedPatientId) return;

    setIsGeneratingAI(true);
    try {
      // Call the local AI assist API
      const response = await fetch('/api/doctor/documentation/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_structured_note',
          patientId: selectedPatientId,
          noteType: documentType,
          existingContent: noteContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.generatedNote) {
          setNoteContent(data.data.generatedNote);
          setAIInsights(data.data.insights || []);
          
          // Automatically run medical coding AI on the generated note
          setTimeout(() => {
            callMedicalCodingAI();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to generate AI note:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateStructuredNote = async (content: string, patientId: string): Promise<string> => {
    // This function is now replaced by the AI API call above
    return content;
  };

  const insertHotphrase = (text: string) => {
    const currentContent = noteContent;
    const newContent = currentContent + (currentContent ? '\n' : '') + text;
    setNoteContent(newContent);
    setAutoSaveStatus('unsaved');
  };

  const handlePushContent = async () => {
    if (!selectedPatientId || !noteContent.trim()) return;
    
    setAutoSaveStatus('saving');
    
    try {
      // Push the finalized note to the patient's chart
      const response = await fetch('/api/doctor/documentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          content: noteContent,
          type: documentType,
          status: 'ready_for_signature'
        }),
      });
      
      if (response.ok) {
        setAutoSaveStatus('saved');
        // Show success toast
        alert('Note accepted and sent to chart');
      } else {
        throw new Error('Failed to push content');
      }
    } catch (error) {
      console.error('Push content failed:', error);
      setAutoSaveStatus('unsaved');
      alert('Failed to push content to chart');
    }
  };
  const handleSignNote = async () => {
    if (!selectedPatientId || !noteContent.trim()) return;
    
    setAutoSaveStatus('saving');
    
    try {
      const response = await fetch('/api/doctor/documentation/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          content: noteContent,
          type: documentType,
          signature: 'electronic',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutoSaveStatus('saved');
        alert('Note signed and finalized successfully');
        
        // Clear the editor for next patient
        setNoteContent('');
        setActiveTemplate('');
        setAIInsights([]);
        setMedicalCodes([]);
        setValidationResults(null);
        
        // Reload notes to show the newly signed note
        loadPatientNotes();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign note');
      }    } catch (error) {
      console.error('Sign note failed:', error);
      setAutoSaveStatus('unsaved');
      alert(`Failed to sign note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // =============================================================================
  // MEDICAL CODING AI INTEGRATION

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: isSelected ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'hover:bg-blue-50/50',
      green: isSelected ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'hover:bg-green-50/50',
      purple: isSelected ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30' : 'hover:bg-purple-50/50',
      orange: isSelected ? 'from-orange-500/20 to-orange-600/20 border-orange-500/30' : 'hover:bg-orange-50/50',
      teal: isSelected ? 'from-teal-500/20 to-teal-600/20 border-teal-500/30' : 'hover:bg-teal-50/50',
      indigo: isSelected ? 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30' : 'hover:bg-indigo-50/50',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Clinical Documentation</h1>
            <p className="text-gray-600">
              AI-powered documentation with voice recognition, templates, and auto-save
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className={`px-3 py-1 rounded-full ${
              autoSaveStatus === 'saved' ? 'bg-green-100 text-green-800' :
              autoSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {autoSaveStatus === 'saved' ? '✓ Saved' :
               autoSaveStatus === 'saving' ? '⟳ Saving...' :
               '● Unsaved'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium"
        >
          📚 Templates
        </button>
        <button
          onClick={() => setShowVitalsModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium"
        >
          🩺 Insert Vitals
        </button>        <button
          onClick={handleVoiceRecording}
          className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
            isVoiceRecording 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' 
              : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
          }`}
        >
          {isVoiceRecording ? (
            <span className="flex items-center space-x-2">
              <span>🔴</span>
              <span>Recording</span>
              <span className="font-mono">
                {Math.floor(voiceRecordingState.duration / 60)}:{(voiceRecordingState.duration % 60).toString().padStart(2, '0')}
              </span>
            </span>
          ) : (
            '🎤 Voice Input'
          )}
        </button>
          {/* AI-powered Generate Note Button */}
        <button
          onClick={handleGenerateAINote}
          disabled={!noteContent.trim() || isGeneratingAI}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingAI ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin">⟳</span>
              <span>Generating...</span>
            </span>
          ) : (
            '🤖 Generate Structured Note'
          )}
        </button>
          <button
          onClick={checkDrugInteractions}
          disabled={!noteContent.trim() || !selectedPatientId}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm font-medium disabled:opacity-50"
        >
          💊 Check Interactions
        </button>
        
        <button
          onClick={callMedicalCodingAI}
          disabled={!noteContent.trim() || !selectedPatientId || isLoading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center space-x-1">
              <span className="animate-spin">⟳</span>
              <span>Coding...</span>
            </span>
          ) : (
            '🏥 Generate Codes'
          )}
        </button>
        
        <button
          onClick={() => callPatientCommunicationAI('education')}
          disabled={!noteContent.trim() || !selectedPatientId || isLoading}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 text-sm font-medium disabled:opacity-50"
        >
          📚 Patient Education
        </button>
        
        <button
          onClick={saveNote}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium"
        >
          💾 Save Note
        </button>
      </div>

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Template Library</h3>
            <button
              onClick={() => setShowTemplateLibrary(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {noteTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h4 className="font-medium text-gray-800 mb-1">{template.name}</h4>
                <p className="text-sm text-gray-600 mb-2">Category: {template.category.toUpperCase()}</p>
                <div className="text-xs text-gray-500">
                  Shortcut: {template.shortcuts.join(', ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {documentTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setDocumentType(type.id as any)}
            className={`
              p-4 rounded-2xl text-left transition-all duration-300
              ${documentType === type.id
                ? `backdrop-blur-xl bg-gradient-to-r ${getColorClasses(type.color, true)} border`
                : `backdrop-blur-xl bg-white/20 border border-white/30 ${getColorClasses(type.color, false)}`
              }
            `}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm">{type.label}</h3>
            <p className="text-xs text-gray-600">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Documentation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6">          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {documentTypes.find(t => t.id === documentType)?.label}
            </h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleGenerateAINote}
                disabled={!noteContent.trim() || isGeneratingAI}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium hover:from-green-600 hover:to-teal-600 transition-all duration-200 text-sm disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <span className="flex items-center space-x-1">
                    <span className="animate-spin">⟳</span>
                    <span>Generating...</span>
                  </span>
                ) : (
                  '🤖 AI Structure'
                )}
              </button>
              
              <button 
                onClick={() => validateDocumentation()}
                disabled={!noteContent.trim()}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm disabled:opacity-50"
              >
                ✅ Validate
              </button>
            </div>
          </div>
          
          {/* Voice Recording Timer */}
          {voiceRecordingState.isRecording && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-700 font-medium">Recording...</span>
                </div>
                <div className="text-red-600 font-mono">
                  {Math.floor(voiceRecordingState.duration / 60)}:{(voiceRecordingState.duration % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="mt-2 text-sm text-red-600">
                Current section: {voiceRecordingState.currentSection.toUpperCase()}
              </div>
            </div>
          )}

          {/* Enhanced Documentation Editor with Speech-to-Text */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Documentation
              </label>
              <SpeechToTextInput
                value={noteContent}
                onChange={setNoteContent}
                placeholder={selectedPatientId 
                  ? `Start documenting for patient ${selectedPatientId}... You can type or use voice input.`
                  : 'Select a patient to begin documentation'
                }
                rows={12}
                className="w-full"
                disabled={!selectedPatientId}
                speechEnabled={speechEnabled}
                onSpeechEnabledChange={setSpeechEnabled}
                language="en-US"
                showWordCount={true}
                label="Documentation"
              />
            </div>

            {/* Section-based Voice Recording */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['hpi', 'physical', 'assessment', 'plan'].map((section) => (
                <button
                  key={section}
                  onClick={() => handleSectionVoiceInput(section as any)}
                  className={`
                    px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                    ${voiceRecordingState.currentSection === section && voiceRecordingState.isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }
                  `}
                >
                  🎤 {section.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>        {/* Sidebar */}
        <div className="space-y-4">
          {/* Hotphrases */}
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">⚡ Hotphrases</h4>
            <div className="space-y-2">
              {[
                { label: 'APSC', text: 'Appears pleasant, stable, and comfortable' },
                { label: 'COVID Eval', text: 'COVID-19 screening negative, no fever, cough, or respiratory symptoms' },
                { label: 'Normal Vitals', text: 'Vital signs: BP 120/80, HR 72, RR 16, Temp 98.6°F, O2 Sat 98% RA' },
                { label: 'Clear Lungs', text: 'Lungs: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi' },
                { label: 'RRR', text: 'Heart: Regular rate and rhythm, no murmurs, rubs, or gallops' },
                { label: 'PAD Assessment', text: 'Assessment: Peripheral Arterial Disease with claudication' }
              ].map((phrase, index) => (
                <button
                  key={index}
                  onClick={() => insertHotphrase(phrase.text)}
                  className="w-full text-left p-2 bg-purple-50/50 hover:bg-purple-100/50 rounded border border-purple-200 text-xs transition-all duration-200"
                >
                  <div className="font-medium text-purple-700">{phrase.label}</div>
                  <div className="text-purple-600 text-xs mt-1">{phrase.text.slice(0, 40)}...</div>
                </button>
              ))}
            </div>
          </div>          {/* AI Insights */}
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🧠 AI Insights</h4>
            <div className="space-y-2 text-sm">
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded border-l-2 ${
                      insight.severity === 'high' ? 'bg-red-50/50 border-red-500' :
                      insight.severity === 'medium' ? 'bg-yellow-50/50 border-yellow-500' :
                      'bg-blue-50/50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">
                        {insight.type === 'warning' ? '⚠️' : 
                         insight.type === 'recommendation' ? '💡' : '📝'}
                      </span>
                      <span className="flex-1">{insight.message}</span>
                    </div>
                  </div>
                ))
              ) : selectedPatientId ? (
                <div className="text-gray-500 text-center py-4">
                  {noteContent.trim() ? 'Add more content for AI insights' : 'Start typing to get AI insights'}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  Select a patient to see AI insights
                </div>
              )}
            </div>
          </div>

          {/* Medical Codes */}
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">📊 Medical Codes</h4>
            <div className="space-y-2">
              {medicalCodes.length > 0 ? (
                medicalCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-green-50/50 rounded border border-green-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-green-700">{code.type}</span>
                      <span className="text-lg font-bold text-green-600">{code.code}</span>
                    </div>
                    <div className="text-sm text-green-600 mb-1">{code.description}</div>
                    <div className="text-xs text-green-500">
                      Confidence: {Math.round(code.confidence * 100)}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-4 text-sm">
                  {noteContent.trim() ? 'Generate AI note for medical codes' : 'No codes available'}
                </div>
              )}
            </div>
          </div>

          {/* Drug Interactions */}
          {drugInteractions.length > 0 && (
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">💊 Drug Interactions</h4>
              <div className="space-y-2">
                {drugInteractions.map((interaction, index) => (
                  <div key={index} className={`p-2 rounded border-l-2 ${
                    interaction.severity === 'HIGH' ? 'bg-red-50/50 border-red-500' :
                    'bg-yellow-50/50 border-yellow-500'
                  }`}>
                    <div className="font-medium text-sm">{interaction.medications.join(' + ')}</div>
                    <div className="text-xs text-gray-600 mt-1">{interaction.description}</div>
                    <div className="text-xs text-blue-600 mt-1">{interaction.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentation Validation */}
          {validationResults && (
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">✅ Validation</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completeness Score</span>
                  <span className={`text-lg font-bold ${
                    validationResults.score >= 80 ? 'text-green-600' :
                    validationResults.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {validationResults.score}%
                  </span>
                </div>
                
                {validationResults.issues.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-700 mb-1">Issues:</div>
                    {validationResults.issues.map((issue: string, index: number) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50/50 p-1 rounded mb-1">
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
                
                {validationResults.suggestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-700 mb-1">Suggestions:</div>
                    {validationResults.suggestions.map((suggestion: string, index: number) => (
                      <div key={index} className="text-xs text-blue-600 bg-blue-50/50 p-1 rounded mb-1">
                        {suggestion}
                      </div>
                    ))}
                  </div>                )}
              </div>
            </div>
          )}

          {/* Recent Notes */}
          {selectedPatientId && (
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">📝 Recent Notes</h4>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-4">
                    <span className="animate-spin text-lg">⟳</span>
                    <div className="text-sm text-gray-500 mt-1">Loading notes...</div>
                  </div>
                ) : recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <div key={note.id} className="p-2 bg-gray-50/50 rounded border hover:bg-gray-100/50 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-gray-700">{note.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          note.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                          note.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">{note.noteType.toUpperCase()}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4 text-sm">
                    No previous notes found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">📋 Templates</h4>
            <div className="space-y-1">
              <button className="w-full text-left p-2 text-sm text-gray-600 hover:bg-white/30 rounded">
                SOAP Note Template
              </button>
              <button className="w-full text-left p-2 text-sm text-gray-600 hover:bg-white/30 rounded">
                Follow-up Template
              </button>
              <button className="w-full text-left p-2 text-sm text-gray-600 hover:bg-white/30 rounded">
                Procedure Note
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Push Content & Sign Bar */}
      {selectedPatientId && noteContent.trim() && (
        <div className="mt-6 p-4 backdrop-blur-xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-white/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-emerald-600">
                <span className="text-2xl">✅</span>
                <span className="ml-2 font-medium">Note Ready for Chart</span>
              </div>
              <div className="text-sm text-gray-600">
                Auto-save: {autoSaveStatus === 'saved' ? '✅ Saved' : autoSaveStatus === 'saving' ? '⏳ Saving...' : '⚠️ Unsaved'}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePushContent}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium"
                disabled={autoSaveStatus === 'saving'}
              >
                📤 Push Content
              </button>
              
              <button
                onClick={handleSignNote}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium"
                disabled={!noteContent.trim()}
              >
                ✍️ Sign Note
              </button>
            </div>          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Enter Vital Signs</h3>
              <button
                onClick={() => setShowVitalsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                  <input
                    type="text"
                    value={vitals.temperature || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="36.5"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={vitals.bloodPressure || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="120/80"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                  <input
                    type="text"
                    value={vitals.heartRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, heartRate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="72"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Respiratory Rate</label>
                  <input
                    type="text"
                    value={vitals.respiratoryRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="16"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">O2 Saturation (%)</label>
                  <input
                    type="text"
                    value={vitals.oxygenSaturation || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="98"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    value={vitals.weight || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="70"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="text"
                    value={vitals.height || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, height: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="170"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
                  <input
                    type="text"
                    value={vitals.bmi || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, bmi: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="24.2"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={insertVitals}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
                >
                  Insert Vitals
                </button>
                <button
                  onClick={() => setShowVitalsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

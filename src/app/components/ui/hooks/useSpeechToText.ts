'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Speech-to-Text Hook - User-Controlled Web Speech API Implementation
 * Reusable hook for speech recognition functionality across the application
 * Features: Medical vocabulary hints, enhanced audio settings, manual start/stop control
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export interface SpeechToTextReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
  }
}

function useSpeechToText(options: SpeechToTextOptions = {}): SpeechToTextReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    onStart,
    onEnd,
    onError,
    onResult,
  } = options;

  // State management
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for immediate state accuracy
  const recognitionRef = useRef<any>(null);
  const hasUserGestureRef = useRef(false);
  const isListeningRef = useRef(false);
  const lastInterimRef = useRef<string>('');  // Initialize speech recognition with advanced configuration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = maxAlternatives;
      
      // Enhanced settings for longer phrase recognition
      recognition.serviceURI = recognition.serviceURI || '';
      
      // Set longer timeouts for better phrase capture
      if ('speechTimeout' in recognition) {
        recognition.speechTimeout = 15000; // 15 seconds - longer timeout
      }
      if ('speechTimeoutBuffer' in recognition) {
        recognition.speechTimeoutBuffer = 5000; // 5 seconds buffer
      }
      if ('endOfSpeechTimeout' in recognition) {
        recognition.endOfSpeechTimeout = 3000; // 3 seconds after speech ends
      }

      // Add medical vocabulary hints for better healthcare terminology recognition
      if ('grammars' in recognition && (window.SpeechGrammarList || window.webkitSpeechGrammarList)) {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammarList = new SpeechGrammarList();
        const medicalPhrases = `
          #JSGF V1.0; grammar phrases;
          public <phrase> = shortness of breath | chest pain | difficulty breathing | 
                           nausea | vomiting | dizziness | headache | fever | chills |
                           abdominal pain | back pain | joint pain | muscle pain |
                           anxiety | depression | fatigue | weakness | confusion |
                           hypertension | diabetes | asthma | allergies | medication |
                           prescription | symptoms | diagnosis | treatment | emergency |
                           blood pressure | heart rate | temperature | weight | height |
                           dosage | milligrams | tablets | capsules | injection |
                           morning | afternoon | evening | bedtime | daily | weekly;
        `;
        try {
          grammarList.addFromString(medicalPhrases, 1);
          recognition.grammars = grammarList;
          console.log('🎤 Medical vocabulary hints added for better recognition');
        } catch (grammarError) {
          console.warn('🎤 Could not add grammar hints:', grammarError);
        }
      }

      // Event handlers with no auto-restart logic
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started (onstart event)');
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
        onStart?.();
      };

      recognition.onspeechstart = () => {
        console.log('🎤 Speech detected - user started speaking');
      };

      recognition.onspeechend = () => {
        console.log('🎤 Speech ended - user stopped speaking');
        setInterimTranscript('');
      };

      recognition.onsoundstart = () => {
        console.log('🎤 Sound detected');
      };

      recognition.onsoundend = () => {
        console.log('🎤 Sound ended');
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended (onend event)', {
          isListening: isListeningRef.current
        });
        
        // Always stop when recognition ends - user must manually restart
        console.log('🎤 Recognition session ended - user must manually restart');
        setIsListening(false);
        isListeningRef.current = false;
        onEnd?.();
      };

      recognition.onresult = (event: any) => {
        console.log('🎤 Speech recognition result event:', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length,
          isFinal: event.results[event.results.length - 1]?.isFinal
        });
        
        let finalTranscript = '';
        let currentInterimTranscript = '';

        // Process ALL results to capture complete phrases
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const resultTranscript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += resultTranscript;
            console.log('🎤 Final transcript part:', resultTranscript);
          } else {
            currentInterimTranscript += resultTranscript;
            console.log('🎤 Interim transcript part:', resultTranscript);
          }
        }

        if (finalTranscript) {
          console.log('🎤 COMPLETE Final transcript received:', finalTranscript);
          setTranscript(prev => {
            const newTranscript = prev + finalTranscript;
            console.log('🎤 Updated accumulated transcript:', newTranscript);
            return newTranscript;
          });
          // Immediately call onResult with final transcript
          onResult?.(finalTranscript, true);
        }

        if (currentInterimTranscript) {
          console.log('🎤 COMPLETE Interim transcript:', currentInterimTranscript);
          setInterimTranscript(currentInterimTranscript);
          lastInterimRef.current = currentInterimTranscript;
          // Call onResult with interim transcript
          onResult?.(currentInterimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        // Only log actual errors, not normal browser timeouts
        if (event.error !== 'aborted') {
          console.error('🎤 Speech recognition error event:', event);
        }
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            console.error('🎤 Permission denied - user rejected microphone access');
            break;
          case 'no-speech':
            if (continuous) {
              console.warn('🎤 No speech detected - continuing to listen...');
              return;
            } else {
              errorMessage = 'No speech detected. Please try speaking again.';
              console.warn('🎤 No speech detected during recording');
            }
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            console.error('🎤 Audio capture failed - microphone hardware issue');
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            console.error('🎤 Network error during speech recognition');
            break;
          case 'not-supported':
            errorMessage = 'Speech recognition is not supported in this browser.';
            console.error('🎤 Speech recognition not supported');
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Try using HTTPS.';
            console.error('🎤 Service not allowed - check HTTPS and permissions');
            break;
          case 'aborted':
            // Recognition was aborted - no auto-restart
            console.log('🎤 Recognition session was aborted');
            setIsListening(false);
            isListeningRef.current = false;
            
            // Finalize any interim text that was captured
            if (lastInterimRef.current.trim()) {
              console.log('🎤 Finalizing interim transcript:', lastInterimRef.current);
              onResult?.(lastInterimRef.current.trim(), true);
              setTranscript(prev => prev + lastInterimRef.current.trim());
              setInterimTranscript('');
              lastInterimRef.current = '';
            }
            return;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Try refreshing the page or using HTTPS.`;
            console.error('🎤 Unknown speech recognition error:', event.error);
        }

        setError(errorMessage);
        setIsListening(false);
        isListeningRef.current = false;
        onError?.(errorMessage);      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onStart, onEnd, onError, onResult]);  const startListening = useCallback(async () => {
    if (!isSupported || isListening || !recognitionRef.current) {
      console.warn('🎤 Cannot start listening:', { isSupported, isListening, hasRecognition: !!recognitionRef.current });
      return;
    }

    // Check for HTTPS requirement (but allow localhost)
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '0.0.0.0';
      const isHTTPS = window.location.protocol === 'https:';
      
      if (!isHTTPS && !isLocalhost) {
        const errorMsg = 'Speech recognition requires HTTPS or localhost';
        console.error('🎤 HTTPS requirement failed');
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
    }

    // Request microphone permissions explicitly with enhanced audio settings
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      stream.getTracks().forEach(track => track.stop());
      hasUserGestureRef.current = true;
    } catch (permissionError: any) {
      console.error('🎤 Microphone permission denied:', permissionError);
      const errorMsg = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setError(null);
    
    // Small delay to ensure browser is ready
    setTimeout(() => {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
        console.log('🎤 Speech recognition started - listening for speech...');
      } catch (err: any) {
        console.error('🎤 Failed to start speech recognition:', err);
        isListeningRef.current = false;
        const errorMsg = `Failed to start speech recognition: ${err.message}`;
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }, 100); // 100ms delay
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    console.log('🎤 stopListening called manually');
    isListeningRef.current = false;
    
    if (recognitionRef.current && isListening) {
      console.log('🎤 Stopping speech recognition...');
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    lastInterimRef.current = '';
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
}

// Export the hook as both default and named export
export { useSpeechToText };
export default useSpeechToText;

'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Speech-to-Text Hook
 * Reusable hook for speech recognition functionality across the application
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
  }
}

export function useSpeechToText(options: SpeechToTextOptions = {}): SpeechToTextReturn {
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

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const hasUserGestureRef = useRef(false);
  // Initialize speech recognition
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

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        onStart?.();
      };

      recognition.onend = () => {
        setIsListening(false);
        onEnd?.();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const resultTranscript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += resultTranscript;
          } else {
            currentInterimTranscript += resultTranscript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          onResult?.(finalTranscript, true);
        }

        setInterimTranscript(currentInterimTranscript);
        if (currentInterimTranscript) {
          onResult?.(currentInterimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            break;
          case 'not-supported':
            errorMessage = 'Speech recognition is not supported in this browser.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Try using HTTPS.';
            break;
          case 'aborted':
            return; // Don't show error for intentional aborts
          default:
            errorMessage = `Speech recognition error: ${event.error}. Try refreshing the page or using HTTPS.`;
        }
        
        setError(errorMessage);
        setIsListening(false);
        onError?.(errorMessage);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onStart, onEnd, onError, onResult]);
  const startListening = useCallback(async () => {
    if (!isSupported || isListening || !recognitionRef.current) {
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
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
    }

    // Request microphone permissions explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      hasUserGestureRef.current = true;
    } catch (permissionError: any) {
      const errorMsg = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      const errorMsg = `Failed to start speech recognition: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);  return {
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

// Default export for compatibility
export default useSpeechToText;

// Also export as const for compatibility
export const useSpeechToTextHook = useSpeechToText;

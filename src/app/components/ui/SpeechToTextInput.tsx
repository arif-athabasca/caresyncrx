/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Speech-to-Text Input Component
 * Reusable component that combines textarea with speech recognition
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useSpeechToText, type SpeechToTextOptions } from './hooks/useSpeechToText';

interface SpeechToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
  showWordCount?: boolean;
  speechEnabled?: boolean;
  onSpeechEnabledChange?: (enabled: boolean) => void;
  language?: string;
  maxLength?: number;
}

export const SpeechToTextInput: React.FC<SpeechToTextInputProps> = ({
  value,
  onChange,
  placeholder = "Type your text here or use voice input...",
  rows = 4,
  className = "",
  disabled = false,
  label,
  showWordCount = false,
  speechEnabled = true,
  onSpeechEnabledChange,
  language = 'en-US',
  maxLength,
}) => {
  const [localSpeechEnabled, setLocalSpeechEnabled] = useState(speechEnabled);
  const [appendMode, setAppendMode] = useState(true);
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  // Update local state when prop changes
  useEffect(() => {
    setLocalSpeechEnabled(speechEnabled);
  }, [speechEnabled]);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophonePermission(permission.state as any);
          
          // Listen for permission changes
          permission.onchange = () => {
            setMicrophonePermission(permission.state as any);
          };
        } catch (error) {
          console.log('🎤 Permission API not supported, will request on first use');
        }
      }
    };

    checkMicrophonePermission();
  }, []);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  } = useSpeechToText({
    language,
    onResult: (newTranscript, isFinal) => {
      if (isFinal && newTranscript.trim()) {
        if (appendMode) {
          const separator = value && !value.endsWith(' ') && !value.endsWith('.') ? ' ' : '';
          const newValue = value + separator + newTranscript.trim();
          onChange(maxLength ? newValue.slice(0, maxLength) : newValue);
        } else {
          onChange(newTranscript.trim());
        }
      }
    },    onError: (errorMessage) => {
      console.error('Speech recognition error:', errorMessage);
      // Update microphone permission state if it's a permission error
      if (errorMessage.includes('denied') || errorMessage.includes('not-allowed')) {
        setMicrophonePermission('denied');
      }
    },
  });

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setMicrophonePermission('denied');
    }  };

  const handleSpeechToggle = (enabled: boolean) => {
    setLocalSpeechEnabled(enabled);
    onSpeechEnabledChange?.(enabled);
    if (!enabled && isListening) {
      stopListening();
    }
  };

  const handleClearText = () => {
    onChange('');
    resetTranscript();
    if (isListening) {
      stopListening();
    }
  };

  const handleModeToggle = () => {
    setAppendMode(!appendMode);
  };

  const isEffectivelyEnabled = localSpeechEnabled && isSupported && !disabled;

  // Debug logging
  useEffect(() => {
    console.log('🎤 Speech input debug info:', {
      isSupported,
      isListening,
      speechEnabled: localSpeechEnabled,
      disabled,
      isEffectivelyEnabled,
      error,
      browserHasSpeechAPI: typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
      isHTTPS: typeof window !== 'undefined' && window.location.protocol === 'https:',
      isLocalhost: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    });
  }, [isSupported, isListening, localSpeechEnabled, disabled, error]);

  return (
    <div className="space-y-2">
      {/* Label and Controls Row */}
      {(label || isSupported) && (
        <div className="flex justify-between items-center">
          {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
          
          {isSupported && (
            <div className="flex items-center space-x-3">
              {/* Speech Mode Toggle */}
              {localSpeechEnabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Mode:</span>
                  <button
                    type="button"
                    onClick={handleModeToggle}
                    className={`text-xs px-2 py-1 rounded ${
                      appendMode 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    title={appendMode ? 'Speech will be added to existing text' : 'Speech will replace existing text'}
                  >
                    {appendMode ? '📝 Append' : '🔄 Replace'}
                  </button>
                </div>
              )}

              {/* Speech Enable/Disable Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Speech:</span>
                <button
                  type="button"
                  onClick={() => handleSpeechToggle(!localSpeechEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSpeechEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  title={localSpeechEnabled ? 'Disable speech input' : 'Enable speech input'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSpeechEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}      {/* Speech Controls */}
      {isEffectivelyEnabled && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
          <div className="flex items-center space-x-3">
            {/* Microphone Permission Button */}
            {microphonePermission === 'denied' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRequestPermission}
                disabled={disabled}
              >
                🎤 Allow Microphone
              </Button>
            )}
            
            <Button
              type="button"
              size="sm"
              variant={isListening ? "critical" : "secondary"}
              onClick={isListening ? stopListening : startListening}
              disabled={disabled || microphonePermission === 'denied'}
            >
              {isListening ? (
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span>🎤 Stop</span>
                </span>
              ) : (
                '🎙️ Start Voice'
              )}
            </Button>

            {value && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearText}
                disabled={disabled}
              >
                🗑️ Clear
              </Button>
            )}
          </div>          {/* Status Indicator */}
          <div className="text-xs text-gray-500">
            {isListening && <span className="text-red-600 font-medium">● Recording...</span>}
            {error && <span className="text-red-600">⚠️ {error}</span>}
            {microphonePermission === 'denied' && !error && (
              <span className="text-amber-600">🔒 Microphone access needed</span>
            )}
            {!isListening && !error && localSpeechEnabled && microphonePermission !== 'denied' && (
              <span className="text-green-600">🎙️ Ready</span>
            )}
          </div>
        </div>
      )}

      {/* Text Input */}
      <div className="relative">
        <textarea
          value={value + (isListening ? interimTranscript : '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            placeholder-gray-400 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${isListening ? 'border-red-300 bg-red-50' : ''}
            ${className}
          `}
        />
        
        {/* Listening Indicator Overlay */}
        {isListening && (
          <div className="absolute top-2 right-2 flex items-center space-x-1 text-red-600 bg-white px-2 py-1 rounded shadow">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Recording...</span>
          </div>
        )}
      </div>      {/* Bottom Info Row */}
      <div className="flex justify-between text-xs text-gray-500">
        <div>
          {!isSupported && (
            <span className="text-amber-600">
              💡 Speech-to-text not supported in this browser. Try Chrome, Edge, or Safari.
            </span>
          )}
          {microphonePermission === 'denied' && isSupported && (
            <span className="text-amber-600">
              🔒 Microphone access denied. Click "Allow Microphone" or check browser settings.
            </span>
          )}
          {interimTranscript && isListening && (
            <span className="text-blue-600">
              Interim: "{interimTranscript}"
            </span>
          )}
        </div>
        
        {showWordCount && (
          <div className="space-x-2">
            <span>Characters: {value.length}</span>
            {maxLength && <span>/ {maxLength}</span>}
            <span>Words: {value.trim() ? value.trim().split(/\s+/).length : 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};

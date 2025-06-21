'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * AI Assistant Panel - Comprehensive AI integration with all healthcare services
 * Features: Multi-service AI, real-time chat, clinical decision support
 */

import React, { useState, useEffect, useRef } from 'react';

interface AIAssistantPanelProps {
  visible: boolean;
  selectedPatientId: string | null;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  source?: string;
  service?: string;
}

type AIService = 'doctor' | 'pharmacist' | 'radiology' | 'laboratory' | 'triage' | 'coding' | 'nutrition' | 'physical_therapy' | 'mental_health' | 'emergency' | 'admin';

const aiServices: { id: AIService; label: string; icon: string; description: string }[] = [
  { id: 'doctor', label: 'Clinical AI', icon: '👨‍⚕️', description: 'General clinical decision support' },
  { id: 'pharmacist', label: 'Pharmacy AI', icon: '💊', description: 'Medication management and interactions' },
  { id: 'radiology', label: 'Radiology AI', icon: '🔬', description: 'Medical imaging analysis' },
  { id: 'laboratory', label: 'Lab AI', icon: '🧪', description: 'Laboratory result interpretation' },
  { id: 'triage', label: 'Triage AI', icon: '🚨', description: 'Patient prioritization and urgency assessment' },
  { id: 'coding', label: 'Coding AI', icon: '📊', description: 'Medical coding and billing assistance' },
  { id: 'nutrition', label: 'Nutrition AI', icon: '🥗', description: 'Dietary recommendations and nutrition planning' },
  { id: 'physical_therapy', label: 'PT AI', icon: '🏃‍♂️', description: 'Physical therapy and rehabilitation' },
  { id: 'mental_health', label: 'Mental Health AI', icon: '🧠', description: 'Mental health assessment and support' },
  { id: 'emergency', label: 'Emergency AI', icon: '🚑', description: 'Emergency protocols and critical care' },
  { id: 'admin', label: 'Admin AI', icon: '📋', description: 'Administrative tasks and workflow optimization' }
];

export default function AIAssistantPanel({ visible, selectedPatientId, onClose }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedService, setSelectedService] = useState<AIService>('doctor');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history when patient changes
  useEffect(() => {
    if (selectedPatientId && visible) {
      loadConversationHistory();
    }
  }, [selectedPatientId, visible]);

  const loadConversationHistory = async () => {
    // In production, load from backend
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI assistant. I can help you with clinical decisions, patient care, and healthcare workflows. How can I assist you today?`,
      timestamp: new Date(),
      service: selectedService
    };
    setMessages([welcomeMessage]);
  };

  const sendAIQuery = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setIsTyping(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');

    try {
      // Call AI service API
      const response = await fetch(`/api/v1/healthcare/${selectedService}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          action: 'clinical_consultation',
          query: query,
          patientId: selectedPatientId,
          context: {
            currentDate: new Date().toISOString(),
            userRole: 'doctor'
          }
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const aiResponse = await response.json();

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.data?.response || 'I apologize, but I encountered an error processing your request. Please try again.',
        confidence: aiResponse.data?.confidence,
        source: aiResponse.data?.source,
        service: selectedService,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI query failed:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m currently unable to process your request. Please check your connection and try again.',
        timestamp: new Date(),
        service: selectedService
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIQuery(currentQuery);
    }
  };

  return (
    <div className={`
      fixed right-0 top-0 h-full w-96
      backdrop-blur-xl bg-white/95
      border-l border-white/30
      shadow-2xl shadow-black/10
      transform transition-transform duration-300 ease-out
      ${visible ? 'translate-x-0' : 'translate-x-full'}
      z-50
      flex flex-col
    `}>
      {/* Header */}
      <div className="p-4 border-b border-white/20 bg-white/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🤖</span>
            AI Assistant
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/30 rounded-lg transition-colors"
            aria-label="Close AI Assistant"
          >
            <span className="text-gray-500">✕</span>
          </button>
        </div>

        {/* Service Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">AI Service</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value as AIService)}
            className="
              w-full p-2 rounded-lg
              backdrop-blur-xl bg-white/50
              border border-white/30
              text-sm text-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
          >
            {aiServices.map(service => (
              <option key={service.id} value={service.id}>
                {service.icon} {service.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            {aiServices.find(s => s.id === selectedService)?.description}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/20 bg-white/50">
        <div className="flex space-x-2">
          <textarea
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${aiServices.find(s => s.id === selectedService)?.label} about patient care...`}
            className="
              flex-1 p-3 rounded-lg
              backdrop-blur-xl bg-white/50
              border border-white/30
              text-sm text-gray-700
              resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => sendAIQuery(currentQuery)}
            disabled={!currentQuery.trim() || isLoading}
            className="
              px-4 py-2 rounded-lg
              bg-gradient-to-r from-blue-500 to-purple-500
              text-white font-medium
              hover:from-blue-600 hover:to-purple-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center justify-center
            "
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '📤'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Chat Message Component
function ChatMessage({ message }: { message: ChatMessage }) {
  const isAI = message.role === 'assistant';
  
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`
        max-w-[80%] p-3 rounded-2xl
        ${isAI 
          ? 'bg-white/60 text-gray-800 border border-white/30' 
          : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
        }
        shadow-lg shadow-black/5
      `}>
        {/* Message Content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        
        {/* Message Metadata */}
        <div className={`
          flex items-center justify-between mt-2 text-xs
          ${isAI ? 'text-gray-500' : 'text-white/70'}
        `}>
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {message.confidence && (
            <span className="flex items-center">
              <span className="mr-1">🎯</span>
              {Math.round(message.confidence * 100)}%
            </span>
          )}
        </div>
        
        {/* AI Service Badge */}
        {isAI && message.service && (
          <div className="mt-2">
            <span className="
              inline-flex items-center px-2 py-1 rounded-full
              text-xs font-medium
              bg-blue-100 text-blue-800
            ">
              {aiServices.find(s => s.id === message.service)?.icon}
              <span className="ml-1">{aiServices.find(s => s.id === message.service)?.label}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Typing Indicator Component
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="
        bg-white/60 border border-white/30 
        rounded-2xl p-3 shadow-lg shadow-black/5
      ">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}

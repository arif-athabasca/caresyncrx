'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Floating Action Buttons - AI Assistant and Communication App integration
 * Features: Glass morphism, smooth animations, accessibility
 */

import React, { useState } from 'react';

interface FloatingActionButtonsProps {
  onToggleAI: () => void;
  onOpenCommunication: () => void;
  aiStatus: 'online' | 'offline' | 'processing';
}

export default function FloatingActionButtons({ 
  onToggleAI, 
  onOpenCommunication, 
  aiStatus 
}: FloatingActionButtonsProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getAIStatusColor = () => {
    switch (aiStatus) {
      case 'online':
        return 'from-green-500/80 to-blue-500/80 ring-green-300/50';
      case 'processing':
        return 'from-purple-500/80 to-pink-500/80 ring-purple-300/50';
      case 'offline':
        return 'from-gray-500/80 to-red-500/80 ring-red-300/50';
      default:
        return 'from-blue-500/80 to-purple-500/80 ring-blue-300/50';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-4">
      {/* AI Assistant Button */}
      <button
        onClick={onToggleAI}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          w-16 h-16 rounded-full
          backdrop-blur-xl bg-gradient-to-r ${getAIStatusColor()}
          border border-white/30
          shadow-2xl shadow-purple-500/30
          hover:scale-110 hover:shadow-purple-500/50
          focus:outline-none focus:ring-2 focus:ring-purple-300/50
          transition-all duration-300 ease-out
          flex items-center justify-center
          ${aiStatus === 'processing' ? 'animate-pulse' : ''}
        `}
        title="Toggle AI Assistant"
        aria-label={`AI Assistant - Status: ${aiStatus}`}
      >
        <span className="text-2xl">
          {aiStatus === 'processing' ? '🧠' : '🤖'}
        </span>
      </button>

      {/* AI Status Tooltip */}
      {isHovered && (
        <div className="
          absolute right-20 bottom-0
          backdrop-blur-xl bg-white/90 
          border border-white/30 
          rounded-lg px-3 py-2
          shadow-xl shadow-black/10
          text-sm font-medium text-gray-800
          whitespace-nowrap
          animate-in slide-in-from-right-5 duration-200
        ">
          AI Assistant - {aiStatus === 'online' ? 'Ready' : aiStatus === 'processing' ? 'Processing...' : 'Offline'}
          <div className="absolute right-[-6px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-white/90 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent" />
        </div>
      )}

      {/* Communication App Button */}
      <button
        onClick={onOpenCommunication}
        className="
          w-14 h-14 rounded-full
          backdrop-blur-xl bg-gradient-to-r from-green-500/80 to-blue-500/80
          border border-white/30
          shadow-2xl shadow-green-500/30
          hover:scale-110 hover:shadow-green-500/50
          focus:outline-none focus:ring-2 focus:ring-green-300/50
          transition-all duration-300 ease-out
          flex items-center justify-center
        "
        title="Open Communication App"
        aria-label="Open external communication application"
      >
        <span className="text-xl">💬</span>
      </button>

      {/* Emergency Quick Actions (on hover) */}
      <div className="
        opacity-0 hover:opacity-100
        transition-opacity duration-300
        space-y-2
      ">
        {/* Emergency Alert Button */}
        <button
          className="
            w-12 h-12 rounded-full
            backdrop-blur-xl bg-gradient-to-r from-red-500/80 to-orange-500/80
            border border-white/30
            shadow-xl shadow-red-500/30
            hover:scale-110 hover:shadow-red-500/50
            focus:outline-none focus:ring-2 focus:ring-red-300/50
            transition-all duration-300 ease-out
            flex items-center justify-center
          "
          title="Emergency Alert"
          aria-label="Trigger emergency alert"
        >
          <span className="text-lg">🚨</span>
        </button>

        {/* Quick Voice Note Button */}
        <button
          className="
            w-12 h-12 rounded-full
            backdrop-blur-xl bg-gradient-to-r from-indigo-500/80 to-purple-500/80
            border border-white/30
            shadow-xl shadow-indigo-500/30
            hover:scale-110 hover:shadow-indigo-500/50
            focus:outline-none focus:ring-2 focus:ring-indigo-300/50
            transition-all duration-300 ease-out
            flex items-center justify-center
          "
          title="Voice Note"
          aria-label="Record voice note"
        >
          <span className="text-lg">🎤</span>
        </button>
      </div>
    </div>
  );
}

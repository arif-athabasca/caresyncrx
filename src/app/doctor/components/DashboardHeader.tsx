'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Dashboard Header - Modern glass morphism header with AI status, notifications, search
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import LogoutButton from '@/components/logout-button';

// Clean, professional icon components
const MenuIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BellIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.09c0-2.18-1.82-4.09-4-4.09S7 6.91 7 9.09V12l-5 5h5m4 0v1a3 3 0 01-6 0v-1m6 0H9" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ShieldIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const WifiIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WifiOffIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364L18.364 5.636" />
  </svg>
);

const MessageIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const SettingsIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogOutIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface Notification {
  id: string;
  type: 'urgent' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface DashboardHeaderProps {
  user: User | null;
  notifications: Notification[];
  aiStatus: 'online' | 'offline' | 'processing';
  onToggleSidebar: () => void;
  onToggleAI: () => void;
  onOpenCommunication: () => void;
}

export default function DashboardHeader({
  user,
  notifications,
  aiStatus,
  onToggleSidebar,
  onToggleAI,
  onOpenCommunication
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global search functionality
  const handleGlobalSearch = async (query: string) => {
    if (query.length < 2) return;
    
    try {
      // In production, this would search patients, appointments, medications, etc.
      console.log('Searching for:', query);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);
  // Get AI status indicator
  const getAIStatusIndicator = () => {
    const baseClasses = "flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium";
    
    switch (aiStatus) {
      case 'online':
        return (
          <div className={`${baseClasses} bg-green-100 text-green-800 border border-green-200`}>
            <WifiIcon className="w-3 h-3" />
            <span>AI Online</span>
          </div>
        );
      case 'processing':
        return (
          <div className={`${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`}>
            <div className="w-3 h-3 animate-spin rounded-full border border-blue-600 border-t-transparent"></div>
            <span>AI Processing</span>
          </div>
        );
      case 'offline':
        return (
          <div className={`${baseClasses} bg-red-100 text-red-800 border border-red-200`}>
            <WifiOffIcon className="w-3 h-3" />
            <span>AI Offline</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="
      sticky top-0 z-50
      backdrop-blur-xl bg-white/80 
      border-b border-white/20
      shadow-lg shadow-black/5
    ">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle */}            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSidebar}
              className="
                p-2 rounded-lg 
                hover:backdrop-blur-xl hover:bg-white/20 
                transition-all duration-200
              "
              aria-label="Toggle sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </Button>
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="
                w-8 h-8 
                bg-gradient-to-r from-blue-500 to-purple-500 
                rounded-lg
                flex items-center justify-center
                shadow-lg
              ">                <ShieldIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">CareSyncRx</h1>
                <p className="text-xs text-gray-500">Doctor Dashboard</p>
              </div>
            </div>
          </div>
          
          {/* Center - Smart Search */}
          <div className="flex-1 max-w-md mx-8">            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleGlobalSearch(e.target.value);
                }}
                placeholder="Search patients, appointments, medications... (⌘K)"
                className="
                  w-full pl-10 pr-4 py-2
                  backdrop-blur-xl bg-white/20 
                  border border-white/30
                  rounded-xl
                  placeholder-gray-500 text-gray-800
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  transition-all duration-200
                "
                aria-label="Global search"
              />
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* AI Status Indicator */}
            {getAIStatusIndicator()}
            
            {/* Communication App Button */}            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCommunication}
              className="
                p-2 rounded-lg 
                hover:backdrop-blur-xl hover:bg-white/20 
                transition-all duration-200
              "
              aria-label="Open communication application"
            >
              <span className="text-lg">💬</span>
            </Button>
              {/* AI Assistant Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAI}
              className="
                p-2 rounded-lg 
                hover:backdrop-blur-xl hover:bg-white/20 
                transition-all duration-200
              "
              aria-label="Toggle AI assistant panel"
            >
              <span className="text-lg">🤖</span>
            </Button>
              {/* Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
                className="
                  p-2 rounded-lg 
                  hover:backdrop-blur-xl hover:bg-white/20 
                  transition-all duration-200
                  relative
                "
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="
                    absolute -top-1 -right-1
                    w-5 h-5 
                    bg-red-500 text-white 
                    rounded-full text-xs
                    flex items-center justify-center
                    font-medium
                  ">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {notificationsPanelOpen && (
                <div className="
                  absolute right-0 top-full mt-2
                  w-80
                  backdrop-blur-xl bg-white/90
                  border border-white/30
                  rounded-xl shadow-2xl
                  max-h-96 overflow-y-auto
                  z-50
                ">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`
                            p-4 hover:bg-white/20 cursor-pointer
                            ${!notification.read ? 'bg-blue-50/50' : ''}
                          `}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Doctor Profile */}            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="
                  flex items-center space-x-2 p-2 rounded-lg 
                  hover:backdrop-blur-xl hover:bg-white/20 
                  transition-all duration-200
                "
                aria-label="User profile menu"
              >
                <div className="
                  w-8 h-8 
                  bg-gradient-to-r from-green-500 to-blue-500 
                  rounded-full
                  flex items-center justify-center
                  text-white font-medium
                ">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'D'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-800">
                    Dr. {user?.firstName || 'Doctor'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </Button>
              
              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="
                  absolute right-0 top-full mt-2
                  w-48
                  backdrop-blur-xl bg-white/90
                  border border-white/30
                  rounded-xl shadow-2xl
                  z-50
                ">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-medium text-gray-800">
                      Dr. {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="p-2">                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {/* Open settings */}}
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Button>                    <div className="mt-2">
                      <LogoutButton 
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Settings Tab - Doctor preferences, security, and system configuration
 * Features: Profile management, AI preferences, notification settings, security controls
 */

import React, { useState, useEffect } from 'react';
import { useDoctorContext } from '../../contexts/DoctorContext';

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  experience: number;
  clinicName: string;
  profilePicture?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  aiAssistance: {
    enabled: boolean;
    autoSuggestions: boolean;
    criticalAlerts: boolean;
    confidenceThreshold: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    criticalOnly: boolean;
  };
  workflow: {
    defaultConsultationTime: number;
    autoScheduling: boolean;
    reminderInterval: number;
  };
}

export default function SettingsTab() {
  const { state, dispatch } = useDoctorContext();
  const [activeSection, setActiveSection] = useState<'profile' | 'preferences' | 'security' | 'notifications' | 'ai'>('profile');
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Mock data - in a real app, this would come from an API
      const mockProfile: DoctorProfile = {
        id: 'doctor-1',
        name: 'Dr. Sarah Wilson',
        email: 'sarah.wilson@caresyncrx.com',
        phone: '+1 (555) 123-4567',
        specialization: 'Internal Medicine',
        licenseNumber: 'MD12345',
        experience: 8,
        clinicName: 'CareSyncRx Medical Center'
      };

      const mockPreferences: UserPreferences = {
        theme: 'light',
        language: 'en',
        timezone: 'America/Toronto',
        aiAssistance: {
          enabled: true,
          autoSuggestions: true,
          criticalAlerts: true,
          confidenceThreshold: 0.85
        },
        notifications: {
          email: true,
          sms: false,
          push: true,
          criticalOnly: false
        },
        workflow: {
          defaultConsultationTime: 30,
          autoScheduling: false,
          reminderInterval: 15
        }
      };

      setProfile(mockProfile);
      setPreferences(mockPreferences);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Mock save - in a real app, this would send data to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', { profile, preferences });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Personal information and credentials' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️', description: 'System preferences and workflow settings' },
    { id: 'ai', label: 'AI Settings', icon: '🤖', description: 'AI assistance and automation preferences' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Alert preferences and communication settings' },
    { id: 'security', label: 'Security', icon: '🔒', description: 'Security settings and privacy controls' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="h-64 bg-gray-200 rounded-xl"></div>
              <div className="lg:col-span-3 h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ⚙️ Settings & Preferences
            </h1>
            <p className="text-gray-600">
              Configure your dashboard, AI assistance, and personal preferences
            </p>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
              <div className="space-y-2">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`
                      w-full text-left p-3 rounded-lg transition-all
                      ${activeSection === section.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/30 hover:bg-white/50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{section.icon}</span>
                      <div>
                        <div className="font-medium">{section.label}</div>
                        <div className="text-xs opacity-75">{section.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              {activeSection === 'profile' && profile && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">👤 Doctor Profile</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                      <select
                        value={profile.specialization}
                        onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      >
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Family Medicine">Family Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Endocrinology">Endocrinology</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                      <input
                        type="text"
                        value={profile.licenseNumber}
                        onChange={(e) => setProfile({...profile, licenseNumber: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={profile.experience}
                        onChange={(e) => setProfile({...profile, experience: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        min="0"
                        max="50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'preferences' && preferences && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">⚙️ System Preferences</h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                        <select
                          value={preferences.theme}
                          onChange={(e) => setPreferences({...preferences, theme: e.target.value as any})}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        >
                          <option value="en">English</option>
                          <option value="fr">French</option>
                          <option value="es">Spanish</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                        >
                          <option value="America/Toronto">Eastern Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h3 className="font-medium text-blue-800 mb-4">Workflow Settings</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Default Consultation Time (minutes)</label>
                          <input
                            type="number"
                            value={preferences.workflow.defaultConsultationTime}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              workflow: {...preferences.workflow, defaultConsultationTime: parseInt(e.target.value)}
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                            min="15"
                            max="120"
                            step="5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Interval (minutes)</label>
                          <input
                            type="number"
                            value={preferences.workflow.reminderInterval}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              workflow: {...preferences.workflow, reminderInterval: parseInt(e.target.value)}
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white"
                            min="5"
                            max="60"
                            step="5"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.autoScheduling}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              workflow: {...preferences.workflow, autoScheduling: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Enable automatic scheduling optimization</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'ai' && preferences && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">🤖 AI Assistant Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h3 className="font-medium text-purple-800 mb-4">AI Assistance</h3>
                      
                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.aiAssistance.enabled}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              aiAssistance: {...preferences.aiAssistance, enabled: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Enable AI assistance</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.aiAssistance.autoSuggestions}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              aiAssistance: {...preferences.aiAssistance, autoSuggestions: e.target.checked}
                            })}
                            className="rounded"
                            disabled={!preferences.aiAssistance.enabled}
                          />
                          <span className="text-sm text-gray-700">Show automatic suggestions</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.aiAssistance.criticalAlerts}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              aiAssistance: {...preferences.aiAssistance, criticalAlerts: e.target.checked}
                            })}
                            className="rounded"
                            disabled={!preferences.aiAssistance.enabled}
                          />
                          <span className="text-sm text-gray-700">Enable critical AI alerts</span>
                        </label>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Confidence Threshold: {Math.round(preferences.aiAssistance.confidenceThreshold * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={preferences.aiAssistance.confidenceThreshold}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              aiAssistance: {...preferences.aiAssistance, confidenceThreshold: parseFloat(e.target.value)}
                            })}
                            className="w-full"
                            disabled={!preferences.aiAssistance.enabled}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Less strict</span>
                            <span>More strict</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && preferences && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">🔔 Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h3 className="font-medium text-green-800 mb-4">Notification Channels</h3>
                      
                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.notifications.email}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              notifications: {...preferences.notifications, email: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Email notifications</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.notifications.sms}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              notifications: {...preferences.notifications, sms: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">SMS notifications</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.notifications.push}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              notifications: {...preferences.notifications, push: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Push notifications</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences.notifications.criticalOnly}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              notifications: {...preferences.notifications, criticalOnly: e.target.checked}
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Critical notifications only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">🔒 Security & Privacy</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <h3 className="font-medium text-red-800 mb-4">Password & Authentication</h3>
                      
                      <div className="space-y-4">
                        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                          Change Password
                        </button>
                        
                        <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                          Enable Two-Factor Authentication
                        </button>
                        
                        <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                          View Login History
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <h3 className="font-medium text-yellow-800 mb-4">Privacy Controls</h3>
                      
                      <div className="space-y-4">
                        <button className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                          Download My Data
                        </button>
                        
                        <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                          Privacy Settings
                        </button>
                        
                        <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>    </div>  );
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Profile Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            defaultValue="Dr. John"
            className="
              w-full p-3 rounded-lg
              backdrop-blur-xl bg-white/50
              border border-white/30
              text-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            defaultValue="Smith"
            className="
              w-full p-3 rounded-lg
              backdrop-blur-xl bg-white/50
              border border-white/30
              text-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Medical License</label>
          <input
            type="text"
            defaultValue="MD123456789"
            className="
              w-full p-3 rounded-lg
              backdrop-blur-xl bg-white/50
              border border-white/30
              text-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
          <select className="
            w-full p-3 rounded-lg
            backdrop-blur-xl bg-white/50
            border border-white/30
            text-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
          ">
            <option>Family Medicine</option>
            <option>Internal Medicine</option>
            <option>Cardiology</option>
            <option>Pediatrics</option>
          </select>
        </div>
      </div>

      <button className="
        px-6 py-3 rounded-lg
        bg-gradient-to-r from-blue-500 to-purple-500
        text-white font-medium
        hover:from-blue-600 hover:to-purple-600
        transition-all duration-200
      ">
        Save Changes
      </button>
    </div>
  );
}

function PreferencesSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">System Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Dark Mode</h4>
            <p className="text-sm text-gray-600">Enable dark theme for better visibility</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">AI Assistance</h4>
            <p className="text-sm text-gray-600">Enable AI-powered clinical suggestions</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Auto-Save Documentation</h4>
            <p className="text-sm text-gray-600">Automatically save clinical notes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Security & Privacy</h3>
      
      <div className="p-4 bg-green-50/50 border border-green-200 rounded-lg">
        <div className="flex items-center mb-2">
          <span className="mr-2">🔒</span>
          <h4 className="font-medium text-green-800">PIPEDA Compliance Active</h4>
        </div>
        <p className="text-sm text-green-700">
          All patient data is encrypted and protected according to Canadian privacy laws
        </p>
      </div>

      <div className="space-y-4">
        <button className="
          w-full p-4 text-left bg-white/20 rounded-lg
          hover:bg-white/30 transition-colors
        ">
          <h4 className="font-medium text-gray-800 mb-1">Change Password</h4>
          <p className="text-sm text-gray-600">Update your account password</p>
        </button>

        <button className="
          w-full p-4 text-left bg-white/20 rounded-lg
          hover:bg-white/30 transition-colors
        ">
          <h4 className="font-medium text-gray-800 mb-1">Two-Factor Authentication</h4>
          <p className="text-sm text-gray-600">Enable 2FA for enhanced security</p>
        </button>

        <button className="
          w-full p-4 text-left bg-white/20 rounded-lg
          hover:bg-white/30 transition-colors
        ">
          <h4 className="font-medium text-gray-800 mb-1">Session Management</h4>
          <p className="text-sm text-gray-600">View and manage active sessions</p>
        </button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Critical Alerts</h4>
            <p className="text-sm text-gray-600">Urgent patient status notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Lab Results</h4>
            <p className="text-sm text-gray-600">New laboratory results notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Appointment Reminders</h4>
            <p className="text-sm text-gray-600">Upcoming appointment notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

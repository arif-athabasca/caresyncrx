'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Animated Sidebar - Modern glass morphism navigation with smooth animations
 * Features: PIPEDA compliant, accessible, responsive design
 */

import React from 'react';
import { DoctorDashboardTab } from '../page';

interface AnimatedSidebarProps {
  activeTab: DoctorDashboardTab;
  collapsed: boolean;
  onTabChange: (tab: DoctorDashboardTab) => void;
}

interface SidebarItem {
  id: DoctorDashboardTab;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    icon: '📊',
    color: 'text-blue-600',
    description: 'Patient overview and AI insights'
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: '👥',
    color: 'text-green-600',
    description: 'Patient management and records'
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: '📅',
    color: 'text-purple-600',
    description: 'Schedule and appointment management'
  },
  {
    id: 'diagnostics',
    label: 'AI Diagnostics',
    icon: '🔬',
    color: 'text-indigo-600',
    description: 'AI-powered diagnostic tools'
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    icon: '💊',
    color: 'text-orange-600',
    description: 'Medication management and e-prescribing'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: '📝',
    color: 'text-teal-600',
    description: 'Clinical notes and documentation'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    color: 'text-pink-600',
    description: 'Reports and performance analytics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    color: 'text-gray-600',
    description: 'System preferences and configuration'
  }
];

export default function AnimatedSidebar({ activeTab, collapsed, onTabChange }: AnimatedSidebarProps) {
  return (
    <nav
      className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] z-30
        backdrop-blur-xl bg-white/20 
        border-r border-white/30
        transition-all duration-300 ease-out
        ${collapsed ? 'w-16' : 'w-64'}
        shadow-2xl shadow-black/10
      `}
      role="navigation"
      aria-label="Doctor Dashboard Navigation"
    >
      {/* Sidebar Content */}
      <div className="p-4 space-y-2">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            collapsed={collapsed}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>

      {/* PIPEDA Compliance Notice (for collapsed state) */}
      {collapsed && (
        <div className="absolute bottom-4 left-2 right-2">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-xs text-green-600 font-bold">🔒</span>
          </div>
        </div>
      )}

      {/* PIPEDA Compliance Notice (for expanded state) */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="
            backdrop-blur-xl bg-green-500/10 
            border border-green-500/20 
            rounded-lg p-3
            text-xs text-green-700
          ">
            <div className="flex items-center mb-1">
              <span className="mr-2">🔒</span>
              <span className="font-semibold">PIPEDA Compliant</span>
            </div>
            <p className="text-green-600">
              All patient data is encrypted and protected according to Canadian privacy laws
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}

interface SidebarItemProps {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function SidebarItem({ item, isActive, collapsed, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center p-3 rounded-xl
        transition-all duration-300 ease-out
        hover:bg-white/30 hover:backdrop-blur-xl
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${isActive 
          ? 'bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/10' 
          : 'hover:translate-x-1'
        }
        ${collapsed ? 'justify-center' : 'justify-start'}
      `}
      title={collapsed ? item.label : undefined}
      aria-label={`${item.label}: ${item.description}`}
    >
      {/* Icon */}
      <div className={`
        text-2xl
        ${isActive ? item.color : 'text-gray-600'}
        transition-colors duration-200
      `}>
        {item.icon}
      </div>

      {/* Label and Description */}
      {!collapsed && (
        <div className="ml-3 flex-1 text-left">
          <div className={`
            font-medium text-sm
            ${isActive ? 'text-gray-800' : 'text-gray-600'}
            transition-colors duration-200
          `}>
            {item.label}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {item.description}
          </div>
        </div>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div className="
          absolute right-0 top-1/2 transform -translate-y-1/2
          w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500
          rounded-l-full
        " />
      )}
    </button>
  );
}

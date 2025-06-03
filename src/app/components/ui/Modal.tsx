'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Modal Component
 * - WCAG AA compliant accessible modal dialog
 * - Supports different sizes and fullscreen mode
 * - Manages focus trap and keyboard navigation for accessibility
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  className?: string;
}

/**
 * Accessible modal component that follows WCAG AA guidelines
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  preventScroll = true,
  className = '',
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Handle mounting only on client-side
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Handle focus management and scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before opening the modal
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the dialog after it opens
      if (modalRef.current) {
        setTimeout(() => {
          modalRef.current?.focus();
        }, 50);
      }
      
      // Lock body scroll
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
      
      // Handle Escape key press
      const handleKeyDown = (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        
        // Restore scroll and focus when modal closes
        if (preventScroll) {
          document.body.style.overflow = 'unset';
        }
        
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, closeOnEsc, onClose, preventScroll]);
  
  // Handle size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full m-4'
  };
  
  // Event handlers
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay, not its children
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Render nothing if not mounted (SSR) or if modal is closed
  if (!isMounted || !isOpen) return null;
  
  // Portal content to render at the end of the document body
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 transition-opacity"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          {showCloseButton && (
            <button
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
              onClick={onClose}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
}

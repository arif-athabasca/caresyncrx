'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Form Components for Triage UI
 * Wraps the base form elements with triage-specific defaults
 */

import React from 'react';
import { 
  Input as BaseInput, 
  Textarea as BaseTextarea,
  Select as BaseSelect 
} from '../../../components/ui/FormElements';

// Create a unique ID for inputs
const createUniqueId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

export interface TriageInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: string;
  id?: string;
}

export function Input({ label, id, ...props }: TriageInputProps) {
  const inputId = id || createUniqueId('input');
  return (
    <BaseInput
      id={inputId}
      label={label || ''}
      {...props}
    />
  );
}

export interface TriageTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label?: string;
  id?: string;
}

export function Textarea({ label, id, ...props }: TriageTextareaProps) {
  const textareaId = id || createUniqueId('textarea');
  return (
    <BaseTextarea
      id={textareaId}
      label={label || ''}
      {...props}
    />
  );
}

export interface TriageSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label?: string;
  id?: string;
  options?: Array<{ value: string; label: string }>;
}

export function Select({ label, id, children, options, ...props }: TriageSelectProps) {
  const selectId = id || createUniqueId('select');
  
  // Convert children to options if no options are provided
  const derivedOptions = options || React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      return {
        value: child.props.value || '',
        label: child.props.children || ''
      };
    }
    return null;
  })?.filter(Boolean) || [];
  
  return (
    <BaseSelect
      id={selectId}
      label={label || ''}
      options={derivedOptions}
      {...props}
    >
      {children}
    </BaseSelect>
  );
}

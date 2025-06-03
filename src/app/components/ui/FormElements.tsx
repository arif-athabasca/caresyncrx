'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Clinical Form Components
 * - WCAG AA accessible form elements
 * - Error states and validation
 * - Mobile-friendly input styles
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputContainerClassName?: string;
}

/**
 * Accessible text input with error states and labels
 */
export function Input({
  label,
  id,
  error,
  helperText,
  required,
  icon,
  isPassword,
  disabled,
  className = '',
  containerClassName = '',
  labelClassName = '',
  inputContainerClassName = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPassword
    ? showPassword ? 'text' : 'password'
    : props.type || 'text';

  return (
    <div className={`w-full ${containerClassName}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${
          error ? 'text-critical' : 'text-gray-700'
        } ${labelClassName}`}
      >
        {label}
        {required && <span className="text-critical ml-1" aria-hidden="true">*</span>}
      </label>
      
      <div className={`mt-1 relative rounded-md ${inputContainerClassName}`}>
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{icon}</span>
          </div>
        )}
        
        <input
          id={id}
          type={inputType}
          className={`w-full rounded-md ${
            icon ? 'pl-10' : 'pl-3'
          } pr-10 py-2 border ${
            error
              ? 'border-critical focus:ring-critical focus:border-critical'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } shadow-sm placeholder:text-gray-400 ${
            disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'bg-white'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-description` : undefined
          }
          disabled={disabled}
          required={required}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={handleTogglePassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {!showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-critical" id={`${id}-error`}>
          {error}
        </p>
      )}
      
      {/* Helper text */}
      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500" id={`${id}-description`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
}

/**
 * Accessible textarea with error states and labels
 */
export function Textarea({
  label,
  id,
  error,
  helperText,
  required,
  disabled,
  className = '',
  containerClassName = '',
  labelClassName = '',
  ...props
}: TextareaProps) {
  return (
    <div className={`w-full ${containerClassName}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${
          error ? 'text-critical' : 'text-gray-700'
        } ${labelClassName}`}
      >
        {label}
        {required && <span className="text-critical ml-1" aria-hidden="true">*</span>}
      </label>
      
      <div className="mt-1">
        <textarea
          id={id}
          className={`w-full rounded-md px-3 py-2 border ${
            error
              ? 'border-critical focus:ring-critical focus:border-critical'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } shadow-sm placeholder:text-gray-400 ${
            disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'bg-white'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-description` : undefined
          }
          disabled={disabled}
          required={required}
          {...props}
        />
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-critical" id={`${id}-error`}>
          {error}
        </p>
      )}
      
      {/* Helper text */}
      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500" id={`${id}-description`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
}

/**
 * Accessible select dropdown with error states and labels
 */
export function Select({
  label,
  id,
  options,
  error,
  helperText,
  required,
  disabled,
  className = '',
  containerClassName = '',
  labelClassName = '',
  ...props
}: SelectProps) {
  return (
    <div className={`w-full ${containerClassName}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${
          error ? 'text-critical' : 'text-gray-700'
        } ${labelClassName}`}
      >
        {label}
        {required && <span className="text-critical ml-1" aria-hidden="true">*</span>}
      </label>
      
      <div className="mt-1 relative rounded-md">
        <select
          id={id}
          className={`w-full rounded-md pl-3 pr-10 py-2 border ${
            error
              ? 'border-critical focus:ring-critical focus:border-critical'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } shadow-sm ${
            disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'bg-white'
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-description` : undefined
          }
          disabled={disabled}
          required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-critical" id={`${id}-error`}>
          {error}
        </p>
      )}
      
      {/* Helper text */}
      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500" id={`${id}-description`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
}

/**
 * Accessible checkbox with error states and labels
 */
export function Checkbox({
  label,
  id,
  error,
  helperText,
  disabled,
  className = '',
  containerClassName = '',
  labelClassName = '',
  ...props
}: CheckboxProps) {
  return (
    <div className={`flex ${containerClassName}`}>
      <div className="flex h-5 items-center">
        <input
          id={id}
          type="checkbox"
          className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-description` : undefined
          }
          disabled={disabled}
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        <label
          htmlFor={id}
          className={`${
            error ? 'text-critical' : disabled ? 'text-gray-500' : 'text-gray-700'
          } ${labelClassName}`}
        >
          {label}
        </label>
        
        {/* Error message */}
        {error && (
          <p className="text-critical" id={`${id}-error`}>
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {!error && helperText && (
          <p className="text-gray-500" id={`${id}-description`}>
            {helperText}
          </p>
        )}
      </div>
    </div>
  );
}

interface RadioGroupProps {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
}

/**
 * Accessible radio group with error states and labels
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
  helperText,
  required,
  disabled,
  className = '',
  optionClassName = '',
}: RadioGroupProps) {
  const groupId = `${name}-radio-group`;
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between">
        <label 
          className={`block text-sm font-medium ${
            error ? 'text-critical' : 'text-gray-700'
          }`}
          id={groupId}
        >
          {label}
          {required && <span className="text-critical ml-1" aria-hidden="true">*</span>}
        </label>
      </div>
      
      <div className="mt-1 space-y-2" role="radiogroup" aria-labelledby={groupId}>
        {options.map((option) => (
          <div key={option.value} className={`flex items-center ${optionClassName}`}>
            <input
              id={`${name}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className={`h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-invalid={error ? 'true' : 'false'}
              disabled={disabled}
              required={required}
            />
            <label
              htmlFor={`${name}-${option.value}`}
              className={`ml-3 block text-sm ${
                disabled ? 'text-gray-500' : 'text-gray-700'
              }`}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-critical" id={`${name}-error`}>
          {error}
        </p>
      )}
      
      {/* Helper text */}
      {!error && helperText && (
        <p className="mt-2 text-sm text-gray-500" id={`${name}-description`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

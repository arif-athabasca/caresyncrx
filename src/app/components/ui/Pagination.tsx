'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Pagination Component
 * - WCAG AA compliant accessible pagination
 * - Mobile responsive design
 * - Supports both numbered pages and simple prev/next navigation
 */

import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showNumbers?: boolean;
  maxDisplayedPages?: number; // Max number of numbered buttons to show
  className?: string;
}

/**
 * Accessible pagination component that follows WCAG AA guidelines
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showNumbers = true,
  maxDisplayedPages = 5,
  className = '',
}: PaginationProps) {
  // Prevent invalid page numbers
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  // Calculate the range of pages to display
  const calculatePageRange = () => {
    if (totalPages <= maxDisplayedPages) {
      // If total pages is less than max display, show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate the start and end page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayedPages / 2));
    let endPage = startPage + maxDisplayedPages - 1;
    
    // Adjust if end page is beyond total pages
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxDisplayedPages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  const pageNumbers = calculatePageRange();
  
  // Helpers for button state
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;
  
  // Base classes for buttons
  const baseButtonClasses = "inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500";
  const activeButtonClasses = "bg-primary-600 text-white hover:bg-primary-700";
  const inactiveButtonClasses = "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50";
  const disabledButtonClasses = "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300";
  
  return (
    <nav 
      className={`flex items-center justify-center ${className}`}
      role="navigation" 
      aria-label="Pagination"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* First page button */}
        {showFirstLast && (
          <button
            onClick={() => !isPrevDisabled && onPageChange(1)}
            disabled={isPrevDisabled}
            aria-label="Go to first page"
            className={`${baseButtonClasses} ${isPrevDisabled ? disabledButtonClasses : inactiveButtonClasses}`}
          >
            <span className="sr-only">First</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Previous page button */}
        <button
          onClick={() => !isPrevDisabled && onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          aria-label="Go to previous page"
          className={`${baseButtonClasses} ${isPrevDisabled ? disabledButtonClasses : inactiveButtonClasses}`}
        >
          <span className="sr-only">Previous</span>
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Numbered page buttons */}
        {showNumbers && (
          <>
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`${baseButtonClasses} ${page === currentPage ? activeButtonClasses : inactiveButtonClasses}`}
              >
                {page}
              </button>
            ))}
          </>
        )}
        
        {/* Next page button */}
        <button
          onClick={() => !isNextDisabled && onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          aria-label="Go to next page"
          className={`${baseButtonClasses} ${isNextDisabled ? disabledButtonClasses : inactiveButtonClasses}`}
        >
          <span className="sr-only">Next</span>
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Last page button */}
        {showFirstLast && (
          <button
            onClick={() => !isNextDisabled && onPageChange(totalPages)}
            disabled={isNextDisabled}
            aria-label="Go to last page"
            className={`${baseButtonClasses} ${isNextDisabled ? disabledButtonClasses : inactiveButtonClasses}`}
          >
            <span className="sr-only">Last</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10 4.293 14.293a1 1 0 000 1.414zm6 0a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L14.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
}

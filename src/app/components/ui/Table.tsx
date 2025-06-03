'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Table Component
 * - WCAG AA compliant accessible data table
 * - Responsive design with horizontal scrolling on mobile
 * - Support for sorting, selecting rows, and custom cell rendering
 */

import React from 'react';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  caption?: string;
  onRowClick?: (row: T) => void;
  isSelectable?: boolean;
  selectedRows?: T[];
  onSelectRow?: (row: T) => void;
  onSelectAll?: (isSelected: boolean) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  sortColumn?: keyof T | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (column: keyof T) => void;
  className?: string;
  wrapperClassName?: string;
  striped?: boolean;
  compact?: boolean;
  bordered?: boolean;
  rounded?: boolean;
}

/**
 * Accessible data table component that follows WCAG AA guidelines
 */
export function Table<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  caption,
  onRowClick,
  isSelectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  isLoading = false,
  emptyMessage = "No data available",
  sortColumn,
  sortDirection,
  onSort,
  className = '',
  wrapperClassName = '',
  striped = false,
  compact = false,
  bordered = false,
  rounded = false,
}: TableProps<T>) {
  // Helper to check if a row is selected
  const isRowSelected = (row: T) => {
    return selectedRows.some(selectedRow => selectedRow[keyField] === row[keyField]);
  };
  
  // All rows selected state
  const allSelected = data.length > 0 && selectedRows.length === data.length;
  
  // Handle select all checkbox change
  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  // Handle sort click
  const handleSortClick = (column: Column<T>) => {
    if (column.sortable && onSort && typeof column.accessor === 'string') {
      onSort(column.accessor);
    }
  };
  
  // Render cell content
  const renderCell = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    
    return row[column.accessor];
  };
  
  // Table style classes
  const tableStyles = [
    'min-w-full divide-y divide-gray-200',
    striped ? 'table-striped' : '',
    compact ? 'table-compact' : '',
    bordered ? 'border border-gray-200' : '',
    rounded ? 'rounded-lg overflow-hidden' : '',
    className
  ].filter(Boolean).join(' ');
  
  // Loading and empty states
  const showEmptyMessage = !isLoading && data.length === 0;
  
  return (
    <div className={`overflow-x-auto ${wrapperClassName}`}>
      <table 
        className={tableStyles}
        role="grid"
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-gray-50">
          <tr>
            {isSelectable && onSelectRow && onSelectAll && (
              <th scope="col" className="w-12 px-4 py-3 text-left">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                  <span className="sr-only">Select all</span>
                </div>
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                } ${column.className || ''}`}
                onClick={column.sortable ? () => handleSortClick(column) : undefined}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  
                  {column.sortable && sortColumn === column.accessor && sortDirection && (
                    <span className="inline-block">
                      {sortDirection === 'asc' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className={`bg-white divide-y divide-gray-200 ${showEmptyMessage ? '' : 'divide-y divide-gray-200'}`}>
          {isLoading && (
            <tr>
              <td
                colSpan={isSelectable ? columns.length + 1 : columns.length}
                className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500"
              >
                <div className="flex justify-center items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          )}
          
          {showEmptyMessage && (
            <tr>
              <td
                colSpan={isSelectable ? columns.length + 1 : columns.length}
                className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          
          {!isLoading &&
            data.map((row) => {
              const isSelected = isRowSelected(row);
              
              return (
                <tr
                  key={String(row[keyField])}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isSelected ? 'bg-primary-50' : ''} ${
                    striped && !isSelected ? 'odd:bg-white even:bg-gray-50' : ''
                  }`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {isSelectable && onSelectRow && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={isSelected}
                          onChange={() => onSelectRow(row)}
                          aria-label={`Select row ${row[keyField]}`}
                        />
                      </div>
                    </td>
                  )}
                  
                  {columns.map((column, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                    >
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

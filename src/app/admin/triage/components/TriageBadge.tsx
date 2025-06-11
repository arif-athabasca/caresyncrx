'use client';

/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Custom Badge Component for Triage UI
 * Extends the base Badge component to support color prop for triage-specific styling
 */

import React from 'react';
import { Badge as BaseBadge, BadgeProps as BaseBadgeProps } from '../../../components/ui/Badge';

export interface TriageBadgeProps extends Omit<BaseBadgeProps, 'variant'> {
  color?: 'red' | 'yellow' | 'green' | 'blue' | string;
}

export function Badge({ color, ...props }: TriageBadgeProps) {
  // Map color to variant
  let variant: BaseBadgeProps['variant'] = 'primary';
  
  if (color === 'red') variant = 'error';
  else if (color === 'yellow') variant = 'warning';
  else if (color === 'green') variant = 'success';
  else if (color === 'blue') variant = 'info';
  
  return <BaseBadge variant={variant} {...props} />;
}

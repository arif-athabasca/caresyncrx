/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * API route for user registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authContainer } from '@/auth/services/container';
import { RateLimiter } from '@/shared/middleware/rate-limit';
import { AuditLogger } from '@/shared/services/audit-logger';
import { UserRole } from '@/auth';
import { passwordValidator } from '@/auth/utils/password-validator';

// Create a Zod schema for password validation
const passwordZodSchema = z.string().refine((password) => {
  const result = passwordValidator(password);
  return result.isValid;
}, (password) => {
  const result = passwordValidator(password);
  return {
    message: result.errors[0] || 'Password does not meet security requirements'
  };
});

// Registration input validation schema
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email address format'),
  password: passwordZodSchema,
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  clinicId: z.string().min(1, 'Clinic ID is required'),
  deviceId: z.string().optional() // Device ID is optional and added by client
});

/**
 * Handle user registration
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const rateLimitResponse = await RateLimiter.check(request, {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 registrations per IP per hour
      message: 'Too many registration attempts, please try again later.'
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }    // Parse and validate request body
    const body = await request.json();
    
    console.log('Registration request body:', JSON.stringify(body, null, 2));
    
    try {
      registerSchema.parse(body);
    } catch (err) {
      console.error('Zod validation error:', err);
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.errors[0].message, field: err.errors[0].path.join('.') },
          { status: 400 }
        );
      }
      throw err;
    }    const { firstName, lastName, email, password, role, clinicId } = body;

    // Get client info for security tracking
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Register the user with auth service
    const authService = authContainer.getAuthService();
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      role,
      clinicId
    });

    // Log successful registration
    await AuditLogger.log({
      userId: result.user.id,
      action: 'USER_REGISTERED',
      details: {
        email,
        role,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        resourceType: 'AUTH'
      }
    });

    // Set authentication cookies
    const response = NextResponse.json({
      user: result.user,
      tokens: result.tokens,
    });

    // Set auth cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 24 * 60 * 60 // 1 day
    };

    response.cookies.set('accessToken', result.tokens.accessToken, cookieOptions);
    
    // Also set a non-HttpOnly cookie for the front-end to know auth status
    response.cookies.set('isAuthenticated', 'true', {
      ...cookieOptions,
      httpOnly: false
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);

    // Log failed registration attempt
    await AuditLogger.log({
      userId: 'unknown',
      action: 'REGISTRATION_FAILED',      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        resourceType: 'AUTH'
      }
    });

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('User already exists')) {
        return NextResponse.json(
          { error: 'Email is already registered' },
          { status: 409 }
        );
      } else if (error.message.includes('Clinic ID is required')) {
        return NextResponse.json(
          { error: 'Clinic ID is required for registration' },
          { status: 400 }
        );
      } else if (error.message.includes('Password does not meet complexity requirements')) {
        return NextResponse.json(
          { error: 'Password does not meet security requirements' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
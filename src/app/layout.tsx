import './globals.css';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../auth/hooks/useAuth';
import { IdleTimeoutProvider } from './components/IdleTimeoutProvider';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CareSyncRx - Healthcare Prescription Management',
  description: 'A secure healthcare prescription management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* 
          Auth System JavaScript Files (loaded in specific order):
          1. auth-core.js - Core authentication functionality
          2. auth-integration.js - Compatibility layer between frontend/backend auth
          3. auth-interceptor.js - HTTP request interceptor for auth headers
          4. auth-session.js - Session management
        */}
        <Script src="/auth-core.js" strategy="beforeInteractive" />
        <Script src="/auth-integration.js" strategy="beforeInteractive" />
        <Script src="/auth-interceptor.js" strategy="beforeInteractive" />
        <Script src="/auth-session.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <IdleTimeoutProvider>
            {children}
          </IdleTimeoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

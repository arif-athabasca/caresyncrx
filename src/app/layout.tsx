import './globals.css';
import type { Metadata } from 'next';
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
        {/* Auth system scripts - loaded in specific order */}
        <Script src="/token-management.js" strategy="beforeInteractive" />
        <Script src="/auth-navigation.js" strategy="beforeInteractive" />
        <Script src="/auth-error-handler.js" strategy="beforeInteractive" />
        <Script src="/auth-logout.js" strategy="beforeInteractive" />
        <Script src="/auth-verification.js" strategy="afterInteractive" />
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

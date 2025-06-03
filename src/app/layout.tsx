import './globals.css';
import type { Metadata } from 'next';
// Remove the font import that's causing issues with Babel
// import { Inter } from 'next/font/google';
import { AuthProvider } from '../auth/hooks/useAuth';
import { IdleTimeoutProvider } from './components/IdleTimeoutProvider';

// Use a CSS class instead of Next.js font module
// const inter = Inter({ subsets: ['latin'] });

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
      <body className="font-sans">
        <AuthProvider>
          <IdleTimeoutProvider>
            {children}
          </IdleTimeoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

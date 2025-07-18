import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Before After - Therapy Diary',
  description: 'A collaborative therapy diary web app',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          {children}
        </main>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#374151',
              boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
              border: '1px solid #e5e7eb',
            },
          }}
        />
      </body>
    </html>
  );
}

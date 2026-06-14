import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ShopWave',
  description: 'Team task management and tracking application',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Navbar />
        {/* md: left margin for sidebar width, mobile: bottom padding for bottom nav */}
        <main className="md:ml-56 pb-16 md:pb-0 pt-16 md:pt-6 px-4 md:px-6 min-h-screen">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

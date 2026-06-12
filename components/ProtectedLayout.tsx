'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    console.log('🔒 Auth check:', user ? 'Authenticated' : 'Not authenticated');
    
    if (!user) {
      window.location.href = '/auth/login';
    } else {
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="md:ml-56 pb-16 md:pb-0 pt-16 md:pt-6 px-4 md:px-6 min-h-screen">
        {children}
      </main>
    </>
  );
}

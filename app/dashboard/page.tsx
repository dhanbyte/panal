'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/auth/login');
        } else {
          setUser(JSON.parse(userStr));
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <Dashboard user={user} />
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
        } else {
          setUser(session.user);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-gray-600 text-sm font-medium">Total Tasks</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-gray-600 text-sm font-medium">Completed</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-gray-600 text-sm font-medium">In Progress</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </div>
      </main>
    </>
  );
}

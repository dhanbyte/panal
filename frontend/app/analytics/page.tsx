'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { TrendingUp } from 'lucide-react';

export default function Analytics() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Team Analytics</h1>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {['Total Tasks', 'Completed', 'In Progress', 'Average Time'].map((metric) => (
            <div key={metric} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">{metric}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Team Leaderboard</h2>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-600">No data yet</p>
          </div>
        </div>
      </main>
    </>
  );
}

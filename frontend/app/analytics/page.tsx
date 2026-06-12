'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { TrendingUp, Loader2 } from 'lucide-react';
import { loadLeaderboard } from '@/lib/data';
import LeaderboardTable from '@/components/LeaderboardTable';
import type { LeaderboardRow } from '@/lib/types';
import { formatTime } from '@/lib/utils';

export default function Analytics() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

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
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchLeaderboard = async () => {
      try {
        const data = await loadLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!user) return null;

  // Compute stats dynamically for the logged-in user
  const myRow = leaderboard.find(r => r.user_id === user.id);
  const totalAssigned = myRow ? myRow.tasks_assigned : 0;
  const totalCompleted = myRow ? myRow.tasks_completed : 0;
  const totalRemaining = myRow ? myRow.tasks_remaining : 0;
  const averageCompletionTime = myRow ? myRow.avg_completion_time : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Team Analytics</h1>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Tasks Assigned</p>
            <p className="text-3xl font-black text-gray-900 mt-2">{totalAssigned}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <p className="text-green-500 text-xs font-bold uppercase tracking-wider">Completed Tasks</p>
            <p className="text-3xl font-black text-green-600 mt-2">{totalCompleted}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">Remaining (Baki)</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{totalRemaining}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <p className="text-blue-500 text-xs font-bold uppercase tracking-wider">Avg Completion Time</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{formatTime(averageCompletionTime)}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Team Leaderboard</h2>
          </div>

          {dataLoading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-blue-500" size={28} />
              <p className="text-gray-500 text-sm">Loading leaderboard data...</p>
            </div>
          ) : (
            <LeaderboardTable rows={leaderboard} />
          )}
        </div>
      </main>
    </>
  );
}

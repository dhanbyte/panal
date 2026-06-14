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
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

        {/* Charts Section */}
        {!dataLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Your Task Distribution</h2>
              <div className="h-64 w-full">
                {totalAssigned > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Completed', value: totalCompleted, color: '#10B981' },
                          { name: 'Remaining', value: totalRemaining, color: '#F59E0B' }
                        ]} 
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="none"
                      >
                        {[
                          { name: 'Completed', value: totalCompleted, color: '#10B981' },
                          { name: 'Remaining', value: totalRemaining, color: '#F59E0B' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No tasks assigned to you yet</div>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Top 5 Performers</h2>
              <div className="h-64 w-full">
                {leaderboard.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaderboard.slice(0, 5).map(r => ({ name: r.user?.full_name?.split(' ')[0] || 'Unknown', completed: r.tasks_completed }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Bar dataKey="completed" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                )}
              </div>
            </div>
          </div>
        )}

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

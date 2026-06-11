'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import { TrendingUp } from 'lucide-react';

export default function Analytics() {
  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {['Total Tasks', 'Completed', 'In Progress', 'Avg Time'].map((m) => (
            <div key={m} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">{m}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
          </div>
          <div className="text-center py-12"><p className="text-gray-600">No data yet</p></div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

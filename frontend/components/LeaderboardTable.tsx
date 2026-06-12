import { formatTime } from '@/lib/utils';
import type { LeaderboardRow } from '@/lib/types';

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
}

export default function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-600">No leaderboard data yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600 font-semibold">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3 text-center">Total Assigned</th>
            <th className="px-4 py-3 text-center">Completed</th>
            <th className="px-4 py-3 text-center">Remaining (Baki)</th>
            <th className="px-4 py-3 text-center">Avg Time</th>
            <th className="px-4 py-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.user_id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-bold text-gray-900">#{index + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
              <td className="px-4 py-3 text-center font-semibold text-gray-600">{row.tasks_assigned}</td>
              <td className="px-4 py-3 text-center font-semibold text-green-600">{row.tasks_completed}</td>
              <td className="px-4 py-3 text-center font-semibold text-amber-600">{row.tasks_remaining}</td>
              <td className="px-4 py-3 text-center text-gray-500">{formatTime(row.avg_completion_time)}</td>
              <td className="px-4 py-3 text-right">
                <span className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-1 font-bold text-blue-600 text-xs">
                  {row.score}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

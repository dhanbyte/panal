'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamData {
  id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export default function Dashboard({ user }: { user: User }) {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    loadTeams();
  }, [user]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) { toast.error('Please enter a team name'); return; }

    try {
      // Ensure user exists in public.users
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
      }, { onConflict: 'id' });

      const { data: team, error } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, role: 'owner' });

      const depts = ['Marketing','Orders','Development','Wholesale','SEO','Sales'];
      await supabase.from('departments').insert(depts.map(name => ({ team_id: team.id, name })));

      toast.success('Team created successfully!');
      setTeamName('');
      setShowCreateTeam(false);
      await loadTeams();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.user_metadata?.full_name || user.email}!
        </h1>
        <p className="text-gray-600 mt-2">Manage your teams and tasks efficiently</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Teams</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{teams.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Members</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Plus className="text-amber-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Teams</h2>
          <button
            onClick={() => setShowCreateTeam(!showCreateTeam)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>New Team</span>
          </button>
        </div>

        {/* Create Team Form */}
        {showCreateTeam && (
          <form onSubmit={handleCreateTeam} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name (e.g., Marketing, Development)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateTeam(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Teams List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 mt-2">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-4">No teams yet. Create one to get started!</p>
            <button
              onClick={() => setShowCreateTeam(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{team.name}</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </p>
                <button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-lg transition-colors font-medium text-sm">
                  View Team
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

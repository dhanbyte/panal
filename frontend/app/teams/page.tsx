'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Plus, Users, X, UserPlus, Crown, Shield, User,
  Loader2, ChevronDown, ChevronUp, Building2, CheckCircle2,
} from 'lucide-react';

const DEPARTMENTS = ['Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales'];

interface Team { id: string; name: string; owner_id: string; created_at: string; }
interface UserProfile { id: string; full_name: string; email: string; department: string; work_role: string; }
interface Member { id: string; user_id: string; role: string; user?: UserProfile; }

export default function TeamsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [allUsers, setAllUsers]       = useState<UserProfile[]>([]);
  const [membersMap, setMembersMap]   = useState<Record<string, Member[]>>({});
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // Create team modal
  const [showCreate, setShowCreate]   = useState(false);
  const [teamName, setTeamName]       = useState('');
  const [creating, setCreating]       = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Invite modal
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<'member' | 'manager'>('member');
  const [inviting, setInviting]         = useState(false);

  useEffect(() => {
    const init = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) { router.push('/auth/login'); return; }

      const u = JSON.parse(userStr);
      setCurrentUser(u);

      // Load all registered users for member selection
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, department, work_role')
        .neq('id', u.id)
        .order('full_name');
      setAllUsers(users || []);

      await loadTeams(u.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadTeams = async (userId: string) => {
    const { data: owned } = await supabase.from('teams').select('*').eq('owner_id', userId);
    const { data: memberOf } = await supabase.from('team_members').select('team_id').eq('user_id', userId);
    const memberIds = (memberOf || []).map((m: any) => m.team_id);

    let all: Team[] = owned || [];
    if (memberIds.length > 0) {
      const { data: joined } = await supabase.from('teams').select('*').in('id', memberIds);
      const seen = new Set(all.map(t => t.id));
      (joined || []).forEach((t: any) => { if (!seen.has(t.id)) all.push(t); });
    }
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTeams(all);
  };

  const loadMembers = async (teamId: string) => {
    if (membersMap[teamId]) return;
    const { data } = await supabase
      .from('team_members')
      .select('id, user_id, role, users(id, full_name, email, department, work_role)')
      .eq('team_id', teamId);
    const members = (data || []).map((m: any) => ({ ...m, user: m.users }));
    setMembersMap(prev => ({ ...prev, [teamId]: members }));
  };

  const deptUsers = selectedDept
    ? allUsers.filter(u => u.department === selectedDept)
    : [];

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !currentUser) return;
    setCreating(true);
    try {
      // 1. Insert team
      const { data: team, error: tErr } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), owner_id: currentUser.id })
        .select().single();

      if (tErr) {
        // If RLS blocks, show exact error
        toast.error(`Team error: ${tErr.message}`);
        return;
      }

      // 2. Add owner as member
      await supabase.from('team_members').insert({
        team_id: team.id, user_id: currentUser.id, role: 'owner',
      });

      // 3. Add selected department members
      if (selectedMembers.length > 0) {
        await supabase.from('team_members').insert(
          selectedMembers.map(uid => ({ team_id: team.id, user_id: uid, role: 'member' }))
        );
        // Notify them
        await supabase.from('notifications').insert(
          selectedMembers.map(uid => ({
            user_id: uid, type: 'task_updated',
            message: `You were added to team "${teamName.trim()}"`,
          }))
        );
      }

      // 4. Create 6 departments
      await supabase.from('departments').insert(
        DEPARTMENTS.map(name => ({ team_id: team.id, name }))
      );

      toast.success('Team created!');
      setShowCreate(false);
      setTeamName('');
      setSelectedDept('');
      setSelectedMembers([]);
      await loadTeams(currentUser.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTeamId) return;
    setInviting(true);
    try {
      const { data: userRecord } = await supabase
        .from('users').select('id, full_name').eq('email', inviteEmail.trim()).single();
      if (!userRecord) throw new Error('User not found. Ask them to register first.');

      await supabase.from('team_members').upsert(
        { team_id: inviteTeamId, user_id: userRecord.id, role: inviteRole },
        { onConflict: 'team_id,user_id' }
      );
      await supabase.from('notifications').insert({
        user_id: userRecord.id, type: 'task_updated',
        message: `You were invited to a team by ${currentUser?.email}`,
      });

      toast.success('Member added!');
      setMembersMap(prev => { const n = { ...prev }; delete n[inviteTeamId]; return n; });
      await loadMembers(inviteTeamId);
      setInviteEmail('');
      setInviteTeamId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={13} className="text-amber-500" />;
    if (role === 'manager') return <Shield size={13} className="text-blue-500" />;
    return <User size={13} className="text-gray-400" />;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">{teams.length} team(s)</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all">
          <Plus size={18} /> New Team
        </button>
      </div>

      {/* Team List */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 mb-4">No teams yet</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> Create your first team
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => {
            const isOwner = team.owner_id === currentUser?.id;
            const expanded = expandedTeam === team.id;
            const members = membersMap[team.id] || [];
            return (
              <div key={team.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => { setExpandedTeam(expanded ? null : team.id); if (!expanded) loadMembers(team.id); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {team.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{team.name}</p>
                      <p className="text-xs text-gray-400">
                        {isOwner ? 'You are owner' : 'Member'} · {new Date(team.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button onClick={e => { e.stopPropagation(); setInviteTeamId(team.id); }}
                        className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl">
                        <UserPlus size={13} /> Invite
                      </button>
                    )}
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {members.length === 0
                      ? <p className="text-sm text-gray-400 py-2 text-center">No members yet</p>
                      : members.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(m.user?.full_name || m.user?.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{m.user?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{m.user?.department} · {m.user?.work_role}</p>
                          </div>
                          <span className="flex items-center gap-1 text-xs capitalize bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg text-gray-500">
                            {roleIcon(m.role)} {m.role}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE TEAM MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create New Team</h2>
              <button onClick={() => { setShowCreate(false); setTeamName(''); setSelectedDept(''); setSelectedMembers([]); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-5 space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                <input type="text" required autoFocus value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. ShopWave Team" />
              </div>

              {/* Department Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Building2 size={14} /> Add Members from Department
                </label>
                <select value={selectedDept}
                  onChange={e => { setSelectedDept(e.target.value); setSelectedMembers([]); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Select Department (Optional) --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Members of selected department */}
              {selectedDept && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedDept} Members
                    {selectedMembers.length > 0 && (
                      <span className="ml-2 text-blue-600 font-normal">({selectedMembers.length} selected)</span>
                    )}
                  </label>
                  {deptUsers.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400">No users in {selectedDept} department yet</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {deptUsers.map(u => {
                        const sel = selectedMembers.includes(u.id);
                        return (
                          <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${sel ? 'bg-blue-50' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(u.full_name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900">{u.full_name || u.email}</p>
                              <p className="text-xs text-gray-400">{u.work_role || 'Member'}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {sel && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400">6 departments auto-created. More members can be added via Invite later.</p>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setTeamName(''); setSelectedDept(''); setSelectedMembers([]); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {inviteTeamId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Invite Member</h2>
              <button onClick={() => { setInviteTeamId(null); setInviteEmail(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required autoFocus value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="member@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">User must be registered first.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setInviteTeamId(null); setInviteEmail(''); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={inviting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {inviting ? <><Loader2 size={15} className="animate-spin" /> Adding...</> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

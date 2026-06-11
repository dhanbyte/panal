'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  X, CheckSquare, Clock, AlertCircle, CheckCircle2,
  User, Users, Calendar, Search, Loader2, Mic, Building2,
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'partially_completed';

interface UserProfile { id: string; full_name: string; email: string; department: string; work_role: string; }
interface Task {
  id: string; title: string; description: string | null;
  status: TaskStatus; progress_percentage: number;
  due_date: string | null; created_at: string; assigned_by: string;
  assignees: { user_id: string; user: UserProfile }[];
}

const DEPARTMENTS = ['Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales'];
const STATUS_CONFIG = {
  pending:             { label: 'Pending',     color: 'bg-gray-100 text-gray-700',   icon: Clock },
  in_progress:         { label: 'In Progress', color: 'bg-blue-100 text-blue-700',   icon: AlertCircle },
  completed:           { label: 'Completed',   color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  partially_completed: { label: 'Partial',     color: 'bg-amber-100 text-amber-700', icon: CheckSquare },
};
const closeForm = () => ({ title: '', description: '', due_date: '', selectedDept: '', selectedUsers: [] as string[] });

export default function TasksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser]       = useState<UserProfile | null>(null);
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [allUsers, setAllUsers]             = useState<UserProfile[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [openAudioId, setOpenAudioId]       = useState<string | null>(null);
  const [showModalAudio, setShowModalAudio] = useState(false);
  const [createdTaskId, setCreatedTaskId]   = useState<string | null>(null);
  const [form, setForm]                     = useState(closeForm());

  const deptMembers = form.selectedDept
    ? allUsers.filter(u => u.department === form.selectedDept && u.id !== currentUser?.id)
    : [];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (!profile) {
        await supabase.from('users').upsert({
          id: session.user.id, email: session.user.email!,
          full_name: session.user.user_metadata?.full_name || null,
        });
        profile = { id: session.user.id, email: session.user.email!, full_name: null, department: null, work_role: null } as any;
      }
      setCurrentUser(profile);

      const { data: users } = await supabase
        .from('users').select('id, full_name, email, department, work_role').order('full_name');
      setAllUsers(users || []);

      await loadTasks(session.user.id);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === 'true') setShowModal(true);
  }, [searchParams]);

  const loadTasks = async (userId: string) => {
    const { data: mine } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id, users(id, full_name, email, department, work_role))')
      .eq('assigned_by', userId).order('created_at', { ascending: false });

    const { data: assignedToMe } = await supabase
      .from('task_assignees').select('task_id').eq('user_id', userId);

    const ids = (assignedToMe || []).map((a: any) => a.task_id);
    let all: any[] = mine || [];

    if (ids.length > 0) {
      const { data: received } = await supabase
        .from('tasks')
        .select('*, task_assignees(user_id, users(id, full_name, email, department, work_role))')
        .in('id', ids).order('created_at', { ascending: false });
      const seen = new Set(all.map((t: any) => t.id));
      (received || []).forEach((t: any) => { if (!seen.has(t.id)) all.push(t); });
    }

    setTasks(all.map((t: any) => ({
      ...t,
      assignees: (t.task_assignees || []).map((a: any) => ({ user_id: a.user_id, user: a.users })),
    })));
  };

  const toggleUser = (uid: string) => {
    setForm(p => ({
      ...p,
      selectedUsers: p.selectedUsers.includes(uid)
        ? p.selectedUsers.filter(id => id !== uid)
        : [...p.selectedUsers, uid],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.selectedDept) { toast.error('Please select a department'); return; }
    if (form.selectedUsers.length === 0) { toast.error('Please select at least one person'); return; }

    setSaving(true);
    try {
      const { data: task, error } = await supabase.from('tasks').insert({
        title: form.title, description: form.description || null,
        due_date: form.due_date || null, assigned_by: currentUser.id,
        status: 'pending', progress_percentage: 0,
      }).select().single();
      if (error) throw error;

      const { error: ae } = await supabase.from('task_assignees').insert(
        form.selectedUsers.map(uid => ({ task_id: task.id, user_id: uid }))
      );
      if (ae) throw ae;

      await supabase.from('notifications').insert(
        form.selectedUsers.map(uid => ({
          user_id: uid, task_id: task.id,
          type: 'task_assigned', message: `New task: "${form.title}"`,
        }))
      );

      toast.success(`Task assigned to ${form.selectedUsers.length} person(s)!`);
      setCreatedTaskId(task.id);
      setShowModalAudio(true);
      setForm(closeForm());
      await loadTasks(currentUser.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetModal = () => {
    setShowModal(false); setShowModalAudio(false);
    setCreatedTaskId(null); setForm(closeForm());
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-shadow">
          <CheckSquare size={16} /> Create Task
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder="Search tasks..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'pending', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === s ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}>
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <CheckSquare className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No tasks found. Create one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const cfg = STATUS_CONFIG[task.status];
            const Icon = cfg.icon;
            return (
              <div key={task.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon size={12} /> {cfg.label}
                      </span>
                      {task.assigned_by === currentUser?.id && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600">You assigned</span>
                      )}
                    </div>
                    {task.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Users size={14} className="text-gray-400" />
                      {task.assignees.map(a => (
                        <span key={a.user_id} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                          <User size={10} /> {a.user?.full_name || a.user?.email || 'Unknown'}
                        </span>
                      ))}
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Calendar size={12} /> Due: {new Date(task.due_date).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                  {task.assignees.some(a => a.user_id === currentUser?.id) && (
                    <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="partially_completed">Partial</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                </div>
                {task.status !== 'pending' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span><span>{task.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${task.progress_percentage}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <button onClick={() => setOpenAudioId(openAudioId === task.id ? null : task.id)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                      openAudioId === task.id ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Mic size={13} /> {openAudioId === task.id ? 'Hide Voice Note' : 'Voice Note'}
                  </button>
                  {openAudioId === task.id && currentUser && (
                    <div className="mt-3">
                      <AudioRecorder taskId={task.id} userId={currentUser.id} onSaved={() => {}} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {showModalAudio ? 'Add Voice Note' : 'Create New Task'}
              </h2>
              <button onClick={resetModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {showModalAudio && createdTaskId && currentUser && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-800">Task created! Record a voice note?</p>
                </div>
                <AudioRecorder taskId={createdTaskId} userId={currentUser.id} onSaved={() => {}} />
                <button onClick={resetModal} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Done, Close
                </button>
              </div>
            )}

            {!showModalAudio && (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                  <input type="text" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What needs to be done?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} rows={2}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add details..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={14} /> Department *
                  </label>
                  <select value={form.selectedDept} required
                    onChange={e => setForm(p => ({ ...p, selectedDept: e.target.value, selectedUsers: [] }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {form.selectedDept && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To * <span className="text-gray-400 font-normal">({form.selectedDept} members)</span>
                    </label>
                    {form.selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.selectedUsers.map(uid => {
                          const m = allUsers.find(u => u.id === uid);
                          return (
                            <span key={uid} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full border border-blue-200">
                              <User size={11} /> {m?.full_name || m?.email}
                              <button type="button" onClick={() => toggleUser(uid)}><X size={12} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {deptMembers.length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400">No members in {form.selectedDept} department</p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                        {deptMembers.map(member => {
                          const selected = form.selectedUsers.includes(member.id);
                          return (
                            <button key={member.id} type="button" onClick={() => toggleUser(member.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(member.full_name || member.email || '?')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900">{member.full_name || 'No name'}</p>
                                <p className="text-xs text-gray-400">{member.work_role || 'Member'}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                {selected && <CheckCircle2 size={12} className="text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.selectedUsers.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1.5">✓ {form.selectedUsers.length} person(s) selected</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetModal}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Assigning...</> : 'Assign Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

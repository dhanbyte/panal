'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  X, CheckSquare, Clock, AlertCircle, CheckCircle2,
  User, Users, Calendar, Search, Loader2, Mic, Building2,
  Square, Play, Pause, Trash2, Send, Plus, Volume2, MessageSquare,
  ChevronDown, ChevronRight, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'partially_completed';

interface UserProfile { id: string; full_name: string; email: string; department: string; work_role: string; }

interface Task {
  id: string; title: string; description: string | null;
  status: TaskStatus; progress_percentage: number;
  due_date: string | null; created_at: string; assigned_by: string;
  creator?: UserProfile;
  assignees: { user_id: string; user: UserProfile }[];
  attachments?: { id: string; file_type: string; file_url: string; created_at: string }[];
}

const DEPARTMENTS = ['Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales'];
const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending:             { label: 'Pending',   bg: 'bg-amber-500',   text: 'text-white' },
  in_progress:         { label: 'Active',    bg: 'bg-blue-500',    text: 'text-white' },
  completed:           { label: 'Done',      bg: 'bg-emerald-500', text: 'text-white' },
  partially_completed: { label: 'Partial',   bg: 'bg-orange-500',  text: 'text-white' },
};

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const defaultForm = () => ({ title: '', description: '', due_date: '', time_hours: '', selectedDept: '', selectedUsers: [] as string[] });

export default function TasksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());

  // Tab + expand
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Audio (create modal)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recDuration, setRecDuration] = useState(0);

  // Inline sub-panels
  const [openAudioTaskId, setOpenAudioTaskId] = useState<string | null>(null);
  const [openChatTaskId, setOpenChatTaskId] = useState<string | null>(null);

  const deptMembers = form.selectedDept
    ? (form.selectedDept === 'All Departments' ? allUsers : allUsers.filter(u => u.department === form.selectedDept)).filter(u => u.id !== currentUser?.id)
    : [];

  useEffect(() => {
    (async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      try {
        const profile = JSON.parse(userStr);
        setCurrentUser(profile);
        const { data: users } = await supabase.from('users').select('id, full_name, email, department, work_role').order('full_name');
        setAllUsers(users || []);
        const { data: depts } = await supabase.from('departments').select('id, name');
        setDepartments(depts || []);
        await loadTasks(profile.id);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { if (searchParams.get('add') === 'true') setShowModal(true); }, [searchParams]);
  useEffect(() => { if (!recording) return; const t = setInterval(() => setRecDuration(p => p + 1), 1000); return () => clearInterval(t); }, [recording]);

  const loadTasks = async (userId: string) => {
    const { data: mine } = await supabase.from('tasks')
      .select('*, creator:users!assigned_by(id, full_name, email, department, work_role), task_assignees(user_id, users(id, full_name, email, department, work_role)), task_attachments(id, file_type, file_url, created_at)')
      .eq('assigned_by', userId).order('created_at', { ascending: false });
    const { data: assignedToMe } = await supabase.from('task_assignees').select('task_id').eq('user_id', userId);
    const ids = (assignedToMe || []).map((a: any) => a.task_id);
    let all: any[] = mine || [];
    if (ids.length > 0) {
      const { data: received } = await supabase.from('tasks')
        .select('*, creator:users!assigned_by(id, full_name, email, department, work_role), task_assignees(user_id, users(id, full_name, email, department, work_role)), task_attachments(id, file_type, file_url, created_at)')
        .in('id', ids).order('created_at', { ascending: false });
      const seen = new Set(all.map((t: any) => t.id));
      (received || []).forEach((t: any) => { if (!seen.has(t.id)) all.push(t); });
    }
    setTasks(all.map((t: any) => ({
      ...t,
      assignees: (t.task_assignees || []).map((a: any) => ({ user_id: a.user_id, user: a.users })),
      attachments: (t.task_attachments || []).filter((att: any) => att.file_type === 'audio'),
    })));
  };

  const toggleUser = (uid: string) => setForm(p => ({ ...p, selectedUsers: p.selectedUsers.includes(uid) ? p.selectedUsers.filter(id => id !== uid) : [...p.selectedUsers, uid] }));
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach(t => t.stop()); };
      mediaRecorderRef.current = recorder; recorder.start(); setRecDuration(0); setRecording(true); setAudioBlob(null); setAudioUrl(null);
    } catch { toast.error('Microphone permission required'); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const togglePlay = () => { if (!audioRef.current) return; if (playing) audioRef.current.pause(); else audioRef.current.play(); setPlaying(!playing); };
  const discardAudio = () => { setAudioBlob(null); setAudioUrl(null); setRecDuration(0); };

  const uploadAudioForTask = async (taskId: string, blob: Blob, userId: string) => {
    const fileName = `${userId}/${taskId}-${Date.now()}.webm`;
    const { data, error } = await supabase.storage.from('task-audio').upload(fileName, blob, { contentType: 'audio/webm', upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from('task-audio').getPublicUrl(data.path);
    await supabase.from('task_attachments').insert({ task_id: taskId, file_type: 'audio', file_url: pub.publicUrl, file_name: fileName, file_size: blob.size });
    return pub.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.selectedDept) { toast.error('Select department'); return; }
    if (form.selectedUsers.length === 0) { toast.error('Select at least one person'); return; }
    setSaving(true);
    try {
      let departmentId = null;
      if (form.selectedDept && form.selectedDept !== 'All Departments') {
        const d = departments.find(d => d.name.toLowerCase() === form.selectedDept.toLowerCase());
        if (d) departmentId = d.id;
      }
      if (!departmentId && form.selectedUsers.length > 0) {
        const u = allUsers.find(u => u.id === form.selectedUsers[0]);
        if (u?.department) { const d = departments.find(d => d.name.toLowerCase() === u.department.toLowerCase()); if (d) departmentId = d.id; }
      }
      if (!departmentId && departments.length > 0) departmentId = departments[0].id;

      const taskData: any = { title: form.title, description: form.description || null, due_date: form.due_date || null, assigned_by: currentUser.id, status: 'pending', progress_percentage: 0 };
      if (departmentId) taskData.department_id = departmentId;
      const { data: task, error } = await supabase.from('tasks').insert(taskData).select().single();
      if (error) throw error;

      const others = form.selectedUsers.filter(uid => uid !== currentUser.id);
      const final = others.length > 0 ? others : form.selectedUsers;
      await supabase.from('task_assignees').insert(final.map(uid => ({ task_id: task.id, user_id: uid })));

      let audioPublicUrl: string | null = null;
      if (audioBlob) { try { audioPublicUrl = await uploadAudioForTask(task.id, audioBlob, currentUser.id); } catch (e) { console.error(e); } }

      const name = currentUser.full_name || currentUser.email || 'Someone';
      await supabase.from('notifications').insert(form.selectedUsers.map(uid => ({ user_id: uid, task_id: task.id, type: 'task_assigned', message: audioPublicUrl ? `🎤 ${name} assigned: "${form.title}" (voice note)` : `📋 ${name} assigned: "${form.title}"` })));

      toast.success(`✅ Task assigned!`);
      resetModal();
      await loadTasks(currentUser.id);
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') { updates.completed_at = new Date().toISOString(); updates.progress_percentage = 100; }
    else if (newStatus === 'in_progress') { updates.started_at = new Date().toISOString(); }
    await supabase.from('tasks').update(updates).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (currentUser) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.assigned_by !== currentUser.id) {
        await supabase.from('notifications').insert({ user_id: task.assigned_by, task_id: taskId, type: newStatus === 'completed' ? 'task_completed' : 'task_updated', message: `${currentUser.full_name} updated "${task.title}" → ${STATUS_CFG[newStatus]?.label}` });
      }
    }
  };

  const resetModal = () => { setShowModal(false); setForm(defaultForm()); discardAudio(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={28} /></div>;

  const myTasks = tasks.filter(t => t.assignees.some(a => a.user_id === currentUser?.id));
  const givenTasks = tasks.filter(t => t.assigned_by === currentUser?.id && !t.assignees.some(a => a.user_id === currentUser?.id));
  const activeTasks = activeTab === 'received' ? myTasks : givenTasks;

  // Split: active vs completed
  const filteredTasks = activeTasks.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const toggle = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setOpenAudioTaskId(null); setOpenChatTaskId(null); }
    else setExpandedId(id);
  };

  /* ─── Single compact task row ─── */
  const TaskRow = ({ task }: { task: Task }) => {
    const open = expandedId === task.id;
    const done = task.status === 'completed';
    const cfg = STATUS_CFG[task.status] || STATUS_CFG.pending;
    const audioCount = task.attachments?.length || 0;
    const who = activeTab === 'received'
      ? (task.creator?.full_name?.split(' ')[0] || '?')
      : (task.assignees[0]?.user?.full_name?.split(' ')[0] || '?');

    return (
      <div className={`mb-2 rounded-xl transition-all duration-200 overflow-hidden bg-white ${
        done 
          ? 'border border-emerald-200 bg-emerald-50/20' 
          : open 
            ? 'border-2 border-blue-500 shadow-md shadow-blue-100' 
            : 'border-2 border-black hover:border-blue-400 shadow-sm'
      }`}>
        {/* ── Row ── */}
        <button onClick={() => toggle(task.id)}
          className={`w-full flex items-center gap-2 px-4 py-3 text-left active:bg-gray-50 transition-colors ${done ? 'opacity-60' : ''}`}>
          {/* Status dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-emerald-400' : task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
          {/* Title */}
          <span className={`flex-1 text-[14px] font-bold truncate ${done ? 'line-through text-gray-400' : 'text-black'}`}>
            {task.title}
          </span>
          {/* Audio badge */}
          {audioCount > 0 && <span className="text-blue-400"><Volume2 size={12} /></span>}
          {/* Name */}
          <span className="text-[10px] text-gray-400 max-w-[50px] truncate">{who}</span>
          {/* Chevron */}
          <ChevronDown size={13} className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* ── Expanded details ── */}
        {open && (
          <div className="px-4 pb-4 pt-1 space-y-2 bg-white">
            {/* Status + due */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
              {task.due_date && (
                <span className="text-[10px] text-gray-400">
                  📅 {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {/* Progress */}
              {task.progress_percentage > 0 && (
                <span className="text-[10px] text-gray-400">{task.progress_percentage}%</span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-[12px] text-gray-500 leading-relaxed">{task.description}</p>
            )}

            {/* Who */}
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <User size={10} />
              {activeTab === 'received'
                ? <span>From: <b className="text-gray-600">{task.creator?.full_name || 'Unknown'}</b></span>
                : <span>To: {task.assignees.map(a => a.user?.full_name?.split(' ')[0] || '?').join(', ')}</span>
              }
            </div>

            {/* Voice notes */}
            {audioCount > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-blue-500 flex items-center gap-1"><Volume2 size={10} /> Voice ({audioCount})</p>
                {task.attachments!.map(att => (
                  <audio key={att.id} src={att.file_url} controls className="w-full h-8" style={{ maxWidth: '100%' }} />
                ))}
              </div>
            )}

            {/* Status change (creator or assignee) */}
            {(task.assignees.some(a => a.user_id === currentUser?.id) || task.assigned_by === currentUser?.id) && (
              <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full">
                <option value="pending">⏳ Pending</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="partially_completed">🟠 Partial</option>
                <option value="completed">✅ Completed</option>
              </select>
            )}

            {/* Action row */}
            <div className="flex gap-2">
              <button onClick={() => setOpenAudioTaskId(openAudioTaskId === task.id ? null : task.id)}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-500 active:bg-gray-100">
                <Mic size={11} /> Voice
              </button>
              <button onClick={() => setOpenChatTaskId(openChatTaskId === task.id ? null : task.id)}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-500 active:bg-gray-100">
                <MessageSquare size={11} /> Chat
              </button>
            </div>

            {openAudioTaskId === task.id && currentUser && (
              <InlineAudioRecorder taskId={task.id} userId={currentUser.id} onSaved={() => loadTasks(currentUser.id)} />
            )}
            {openChatTaskId === task.id && currentUser && (
              <TaskChat task={task} currentUser={currentUser} />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1 bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:bg-blue-600">
          <Plus size={14} /> New
        </button>
      </div>

      {/* ── Tab Toggle (small pills) ── */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => { setActiveTab('received'); setExpandedId(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'received'
              ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
              : 'bg-gray-100 text-gray-500'
          }`}>
          <ArrowDownToLine size={13} />
          Received
          <span className={`text-[10px] px-1.5 rounded-full font-bold ${activeTab === 'received' ? 'bg-white/25' : 'bg-gray-200'}`}>
            {myTasks.length}
          </span>
        </button>
        <button onClick={() => { setActiveTab('given'); setExpandedId(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'given'
              ? 'bg-purple-500 text-white shadow-sm shadow-purple-200'
              : 'bg-gray-100 text-gray-500'
          }`}>
          <ArrowUpFromLine size={13} />
          Given
          <span className={`text-[10px] px-1.5 rounded-full font-bold ${activeTab === 'given' ? 'bg-white/25' : 'bg-gray-200'}`}>
            {givenTasks.length}
          </span>
        </button>
      </div>

      {/* ── Status Filter ── */}
      <div className="flex gap-1.5 overflow-x-auto mb-3">
        {['all', 'pending', 'in_progress', 'completed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              filterStatus === s ? 'bg-gray-800 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All Tasks' : s === 'in_progress' ? 'Active' : s === 'pending' ? 'Pending' : 'Completed'}
          </button>
        ))}
      </div>

      {/* ── Active tasks ── */}
      {pendingTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="text-center py-10">
          <CheckSquare className="mx-auto text-gray-200 mb-2" size={32} />
          <p className="text-xs text-gray-400">{activeTab === 'received' ? 'No tasks for you' : 'No tasks given by you'}</p>
        </div>
      ) : (
        <>
          {/* Pending/Active */}
          {pendingTasks.length > 0 && (
            <div className="mb-4">
              {pendingTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}

          {/* Completed section */}
          {completedTasks.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed ({completedTasks.length})
              </p>
              <div className="opacity-80">
                {completedTasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ CREATE TASK MODAL ═══════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Plus size={16} className="text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-900">New Task</h2>
              </div>
              <button onClick={resetModal} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Title */}
              <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Task title *" />

              {/* Description */}
              <textarea value={form.description} rows={2} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Description (optional)" />

              {/* Due Date presets */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Due date</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{ l: '1D', d: 1 }, { l: '2D', d: 2 }, { l: '3D', d: 3 }, { l: '4D', d: 4 }, { l: '7D', d: 7 }].map(p => {
                    const ds = getLocalDateString(p.d);
                    return (
                      <button key={p.d} type="button" onClick={() => setForm(prev => ({ ...prev, due_date: ds }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${form.due_date === ds ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {p.l}
                      </button>
                    );
                  })}
                  {form.due_date && <button type="button" onClick={() => setForm(p => ({ ...p, due_date: '' }))} className="text-[11px] text-red-400 font-medium ml-auto">Clear</button>}
                </div>
                <input type="date" value={form.due_date} min={getLocalDateString(0)} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mt-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Department */}
              <select value={form.selectedDept} required onChange={e => setForm(p => ({ ...p, selectedDept: e.target.value, selectedUsers: [] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select Department *</option>
                <option value="All Departments">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Members */}
              {form.selectedDept && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Assign to ({deptMembers.length})</p>
                  {form.selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {form.selectedUsers.map(uid => {
                        const m = allUsers.find(u => u.id === uid);
                        return <span key={uid} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {m?.full_name?.split(' ')[0] || m?.email?.split('@')[0]}
                          <button type="button" onClick={() => toggleUser(uid)}><X size={10} /></button>
                        </span>;
                      })}
                    </div>
                  )}
                  <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-50">
                    {deptMembers.map(m => {
                      const sel = form.selectedUsers.includes(m.id);
                      return (
                        <button key={m.id} type="button" onClick={() => toggleUser(m.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${sel ? 'bg-blue-50/50' : ''}`}>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(m.full_name || m.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="flex-1 text-left text-gray-800 font-medium truncate">{m.full_name || m.email}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sel ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                            {sel && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voice Note */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 flex items-center gap-1"><Mic size={12} className="text-blue-500" /> Voice Note</span>
                  {recording && <span className="text-[10px] text-red-500 font-bold animate-pulse">● {fmt(recDuration)}</span>}
                  {audioBlob && !recording && <span className="text-[10px] text-emerald-500 font-medium">✓ Ready</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!recording ? (
                    <button type="button" onClick={startRecording} disabled={!!audioBlob}
                      className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-30">
                      <Mic size={12} /> Record
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium">
                      <Square size={12} /> Stop
                    </button>
                  )}
                  {audioUrl && !recording && (
                    <>
                      <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
                      <button type="button" onClick={togglePlay} className="flex items-center gap-1 border border-gray-300 px-2 py-1.5 rounded-lg text-[11px]">
                        {playing ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <button type="button" onClick={discardAudio} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={resetModal} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {saving ? 'Sending...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ Inline Audio Recorder ═══════ */
function InlineAudioRecorder({ taskId, userId, onSaved }: { taskId: string; userId: string; onSaved: () => void }) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!recording) return; const t = setInterval(() => setDuration(p => p + 1), 1000); return () => clearInterval(t); }, [recording]);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { const b = new Blob(chunksRef.current, { type: 'audio/webm' }); setAudioBlob(b); setAudioUrl(URL.createObjectURL(b)); stream.getTracks().forEach(t => t.stop()); setSaved(false); };
      mediaRecorderRef.current = rec; rec.start(); setDuration(0); setRecording(true); setAudioBlob(null); setAudioUrl(null);
    } catch { toast.error('Mic access required'); }
  };
  const stopRec = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const togglePlay = () => { if (!audioRef.current) return; if (playing) audioRef.current.pause(); else audioRef.current.play(); setPlaying(!playing); };
  const discard = () => { setAudioBlob(null); setAudioUrl(null); setDuration(0); setSaved(false); };

  const upload = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const fn = `${userId}/${taskId}-${Date.now()}.webm`;
      const { data, error } = await supabase.storage.from('task-audio').upload(fn, audioBlob, { contentType: 'audio/webm', upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('task-audio').getPublicUrl(data.path);
      await supabase.from('task_attachments').insert({ task_id: taskId, file_type: 'audio', file_url: pub.publicUrl, file_name: fn, file_size: audioBlob.size });
      toast.success('🎤 Sent!'); setSaved(true); onSaved();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1"><Mic size={10} className="text-blue-500" /> Record</span>
        {recording && <span className="text-[10px] text-red-500 font-bold animate-pulse">● {fmt(duration)}</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {!recording ? (
          <button onClick={startRec} disabled={!!(audioBlob && !saved)} className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-[10px] font-medium disabled:opacity-30"><Mic size={10} /> Rec</button>
        ) : (
          <button onClick={stopRec} className="flex items-center gap-1 bg-gray-800 text-white px-2 py-1 rounded text-[10px] font-medium"><Square size={10} /> Stop</button>
        )}
        {audioUrl && !recording && (
          <>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
            <button onClick={togglePlay} className="border border-gray-300 px-2 py-1 rounded text-[10px]">{playing ? <Pause size={10} /> : <Play size={10} />}</button>
            {!saved && <button onClick={upload} disabled={uploading} className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-medium disabled:opacity-50">{uploading ? '...' : 'Send'}</button>}
            {saved && <span className="text-[10px] text-emerald-500 font-medium">✓ Sent</span>}
            <button onClick={discard} className="text-gray-400 hover:text-red-500"><Trash2 size={10} /></button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════ Task Chat ═══════ */
interface Comment { id: string; task_id: string; user_id: string; comment: string; created_at: string; users?: { full_name: string | null; email: string }; }

function TaskChat({ task, currentUser }: { task: Task; currentUser: UserProfile }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from('task_comments').select('*, users(full_name, email)').eq('task_id', task.id).order('created_at', { ascending: true });
      if (mounted) { setComments(data as Comment[] || []); setLoading(false); scrollToBottom(); }
    })();

    const ch = supabase.channel(`comments-${task.id}`);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, async (p) => {
      const { data: u } = await supabase.from('users').select('full_name, email').eq('id', p.new.user_id).single();
      const nc: Comment = { id: p.new.id, task_id: p.new.task_id, user_id: p.new.user_id, comment: p.new.comment, created_at: p.new.created_at, users: u || undefined };
      if (mounted) { setComments(prev => prev.some(c => c.id === nc.id) ? prev : [...prev, nc]); scrollToBottom(); }
    });
    ch.subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [task.id]);

  useEffect(() => { scrollToBottom(); }, [comments]);
  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim(); setText('');
    try {
      const { data, error } = await supabase.from('task_comments').insert({ task_id: task.id, user_id: currentUser.id, comment: msg }).select().single();
      if (error) throw error;
      
      // Instantly show in UI without waiting for realtime
      if (data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return [...prev, { ...data, users: { full_name: currentUser.full_name, email: currentUser.email } } as Comment];
        });
        scrollToBottom();
      }

      const rIds = new Set<string>();
      if (task.assigned_by && task.assigned_by !== currentUser.id) rIds.add(task.assigned_by);
      task.assignees?.forEach(a => { if (a.user_id !== currentUser.id) rIds.add(a.user_id); });
      if (rIds.size > 0) {
        await supabase.from('notifications').insert(Array.from(rIds).map(uid => ({ user_id: uid, task_id: task.id, type: 'comment_added', message: `💬 ${currentUser.full_name || 'Someone'}: ${msg.slice(0, 50)}` })));
      }
    } catch (err: any) { toast.error(err.message || 'Failed'); setText(msg); }
    finally { setSending(false); }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-2 flex flex-col max-h-60">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><MessageSquare size={9} /> Chat</p>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 min-h-[60px] max-h-36">
        {loading ? <div className="py-3 text-center"><Loader2 size={14} className="animate-spin text-blue-400 mx-auto" /></div>
        : comments.length === 0 ? <p className="text-center text-[10px] text-gray-300 py-4">No messages</p>
        : comments.map(c => {
          const me = c.user_id === currentUser.id;
          return (
            <div key={c.id} className={`flex flex-col ${me ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-2 py-1 text-[11px] ${me ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                {!me && <p className="text-[8px] font-bold text-blue-500">{c.users?.full_name?.split(' ')[0] || '?'}</p>}
                <p className="break-words">{c.comment}</p>
              </div>
              <span className="text-[7px] text-gray-300 mt-0.5 px-0.5">{new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={send} className="flex gap-1">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..."
          className="flex-1 border border-gray-200 rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
        <button type="submit" disabled={!text.trim() || sending}
          className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] disabled:opacity-40">
          {sending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
        </button>
      </form>
    </div>
  );
}

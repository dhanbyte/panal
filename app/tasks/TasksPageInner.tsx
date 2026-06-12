'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  X, CheckSquare, Clock, AlertCircle, CheckCircle2,
  User, Users, Calendar, Search, Loader2, Mic, Building2,
  Square, Play, Pause, Trash2, Send, Plus, Volume2, MessageSquare,
} from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'partially_completed';

interface UserProfile { id: string; full_name: string; email: string; department: string; work_role: string; }
interface Task {
  id: string; title: string; description: string | null;
  status: TaskStatus; progress_percentage: number;
  due_date: string | null; created_at: string; assigned_by: string;
  assignees: { user_id: string; user: UserProfile }[];
  attachments?: { id: string; file_type: string; file_url: string; created_at: string }[];
}

const DEPARTMENTS = ['Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales'];
const STATUS_CONFIG = {
  pending:             { label: 'Pending',     color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  in_progress:         { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border border-blue-200',   icon: AlertCircle },
  completed:           { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 },
  partially_completed: { label: 'Partial',     color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: CheckSquare },
};
const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultForm = () => ({ title: '', description: '', due_date: '', time_hours: '', selectedDept: '', selectedUsers: [] as string[] });

export default function TasksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser]       = useState<UserProfile | null>(null);
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [allUsers, setAllUsers]             = useState<UserProfile[]>([]);
  const [departments, setDepartments]       = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [form, setForm]                     = useState(defaultForm());

  // Audio recording state (inside create-task modal)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording]     = useState(false);
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]       = useState<string | null>(null);
  const [playing, setPlaying]         = useState(false);
  const [recDuration, setRecDuration] = useState(0);

  // Inline audio recorder for existing tasks
  const [openAudioTaskId, setOpenAudioTaskId] = useState<string | null>(null);

  // Real-time Chat for tasks
  const [openChatTaskId, setOpenChatTaskId] = useState<string | null>(null);

  const deptMembers = form.selectedDept
    ? form.selectedDept === 'All Departments'
      ? allUsers
      : allUsers.filter(u => u.department === form.selectedDept)
    : [];

  useEffect(() => {
    const init = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      try {
        const profile = JSON.parse(userStr);
        setCurrentUser(profile);
        const { data: users } = await supabase
          .from('users').select('id, full_name, email, department, work_role').order('full_name');
        setAllUsers(users || []);

        const { data: depts } = await supabase
          .from('departments').select('id, name');
        setDepartments(depts || []);

        await loadTasks(profile.id);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === 'true') setShowModal(true);
  }, [searchParams]);

  // Recording timer
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setRecDuration(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const loadTasks = async (userId: string) => {
    const { data: mine } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id, users(id, full_name, email, department, work_role)), task_attachments(id, file_type, file_url, created_at)')
      .eq('assigned_by', userId).order('created_at', { ascending: false });

    const { data: assignedToMe } = await supabase
      .from('task_assignees').select('task_id').eq('user_id', userId);

    const ids = (assignedToMe || []).map((a: any) => a.task_id);
    let all: any[] = mine || [];

    if (ids.length > 0) {
      const { data: received } = await supabase
        .from('tasks')
        .select('*, task_assignees(user_id, users(id, full_name, email, department, work_role)), task_attachments(id, file_type, file_url, created_at)')
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

  const toggleUser = (uid: string) => {
    setForm(p => ({
      ...p,
      selectedUsers: p.selectedUsers.includes(uid)
        ? p.selectedUsers.filter(id => id !== uid)
        : [...p.selectedUsers, uid],
    }));
  };

  // ── Audio helpers ──
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecDuration(0);
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch {
      toast.error('Microphone permission required');
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play();
    setPlaying(!playing);
  };

  const discardAudio = () => { setAudioBlob(null); setAudioUrl(null); setRecDuration(0); };

  const uploadAudioForTask = async (taskId: string, blob: Blob, userId: string) => {
    const fileName = `${userId}/${taskId}-${Date.now()}.webm`;
    const { data, error } = await supabase.storage
      .from('task-audio')
      .upload(fileName, blob, { contentType: 'audio/webm', upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from('task-audio').getPublicUrl(data.path);
    await supabase.from('task_attachments').insert({
      task_id: taskId, file_type: 'audio',
      file_url: pub.publicUrl, file_name: fileName, file_size: blob.size,
    });
    return pub.publicUrl;
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.selectedDept) { toast.error('Please select a department'); return; }
    if (form.selectedUsers.length === 0) { toast.error('Please select at least one person'); return; }

    setSaving(true);
    try {
      // Resolve department_id to avoid "null value in column department_id violates not-null constraint"
      let departmentId = null;
      if (form.selectedDept && form.selectedDept !== 'All Departments') {
        const deptObj = departments.find(d => d.name.toLowerCase() === form.selectedDept.toLowerCase());
        if (deptObj) departmentId = deptObj.id;
      }
      if (!departmentId && form.selectedUsers.length > 0) {
        const firstUser = allUsers.find(u => u.id === form.selectedUsers[0]);
        if (firstUser && firstUser.department) {
          const deptObj = departments.find(d => d.name.toLowerCase() === firstUser.department.toLowerCase());
          if (deptObj) departmentId = deptObj.id;
        }
      }
      if (!departmentId && departments.length > 0) {
        departmentId = departments[0].id;
      }

      // 1. Create the task
      const { data: task, error } = await supabase.from('tasks').insert({
        title: form.title,
        description: form.description || null,
        due_date: form.due_date || null,
        assigned_by: currentUser.id,
        department_id: departmentId,
        status: 'pending',
        progress_percentage: 0,
      }).select().single();
      if (error) throw error;

      // Ensure that if assigning to others, the creator is NOT assigned to it
      const otherUsersSelected = form.selectedUsers.filter(uid => uid !== currentUser.id);
      const finalSelectedUsers = otherUsersSelected.length > 0 ? otherUsersSelected : form.selectedUsers;

      // 2. Assign users
      const { error: ae } = await supabase.from('task_assignees').insert(
          finalSelectedUsers.map(uid => ({ task_id: task.id, user_id: uid }))
      );
      if (ae) throw ae;

      // 3. Upload audio if recorded
      let audioPublicUrl: string | null = null;
      if (audioBlob) {
        try {
          audioPublicUrl = await uploadAudioForTask(task.id, audioBlob, currentUser.id);
        } catch (audioErr: any) {
          console.error('Audio upload failed:', audioErr);
          // Don't block task creation if audio upload fails
        }
      }

      // 4. Send notifications to ALL assigned users
      const assignerName = currentUser.full_name || currentUser.email || 'Someone';
      const notifMessage = audioPublicUrl
          ? `🎤 ${assignerName} assigned you a new task: "${form.title}" (with voice note)`
          : `📋 ${assignerName} assigned you a new task: "${form.title}"`;

      await supabase.from('notifications').insert(
          form.selectedUsers.map(uid => ({
            user_id: uid,
            task_id: task.id,
            type: 'task_assigned',
            message: notifMessage,
          }))
      );

      toast.success(
          `✅ Task assigned to ${form.selectedUsers.length} person(s)!${audioBlob ? ' Voice note attached.' : ''}`,
          { duration: 4000 }
      );

      resetModal();
      await loadTasks(currentUser.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.progress_percentage = 100;
    } else if (newStatus === 'in_progress') {
      updates.started_at = new Date().toISOString();
    }
    await supabase.from('tasks').update(updates).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    // Send notification about status change
    if (currentUser) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        // Notify the assigner
        if (task.assigned_by !== currentUser.id) {
          await supabase.from('notifications').insert({
            user_id: task.assigned_by,
            task_id: taskId,
            type: newStatus === 'completed' ? 'task_completed' : 'task_updated',
            message: `${currentUser.full_name} updated "${task.title}" to ${statusLabel}`,
          });
        }
      }
    }
  };

  const filteredTasks = tasks.filter(t =>
      (filterStatus === 'all' || t.status === filterStatus) &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetModal = () => {
    setShowModal(false);
    setForm(defaultForm());
    discardAudio();
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
  );

  const tasksAssignedToMe = filteredTasks.filter(t => t.assignees.some(a => a.user_id === currentUser?.id));
  const tasksAssignedByMe = filteredTasks.filter(t => t.assigned_by === currentUser?.id && !t.assignees.some(a => a.user_id === currentUser?.id));

  const renderTaskCard = (task: Task) => {
    const cfg = STATUS_CONFIG[task.status];
    const Icon = cfg.icon;
    const isCompleted = task.status === 'completed';
    return (
      <div key={task.id} className={`relative rounded-2xl p-5 transition-all duration-300 ${
        isCompleted 
          ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 shadow-emerald-100 shadow-sm' 
          : 'bg-white border border-gray-200 hover:shadow-md'
      }`}>
        {/* Completed overlay checkmark */}
        {isCompleted && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-bounce" style={{ animationDuration: '2s', animationIterationCount: 1 }}>
            <CheckCircle2 size={18} className="text-white" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold truncate ${isCompleted ? 'line-through text-emerald-700 decoration-emerald-400 decoration-2' : 'text-gray-900'}`}>{task.title}</h3>
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                <Icon size={12} /> {cfg.label}
              </span>
              {isCompleted && (
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                  ✅ Done
                </span>
              )}
              {task.assigned_by === currentUser?.id && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 font-medium">You assigned</span>
              )}
            </div>
            {task.description && <p className={`text-sm mt-1.5 line-clamp-2 ${isCompleted ? 'text-emerald-600/60 line-through' : 'text-gray-500'}`}>{task.description}</p>}
            
            {/* Assignees */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Users size={14} className={isCompleted ? 'text-emerald-400' : 'text-gray-400'} />
              {task.assignees.map(a => (
                <span key={a.user_id} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  <User size={10} /> {a.user?.full_name || a.user?.email || 'Unknown'}
                </span>
              ))}
            </div>

            {/* Due date */}
            {task.due_date && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${isCompleted ? 'text-emerald-500' : 'text-amber-600'}`}>
                <Calendar size={12} /> {isCompleted ? '✅ Completed' : 'Due'}: {new Date(task.due_date).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>

          {/* Status changer for assignees */}
          {task.assignees.some(a => a.user_id === currentUser?.id) && (
            <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
              className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 cursor-pointer min-w-[100px] ${
                isCompleted 
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:ring-emerald-400' 
                  : 'border-gray-200 bg-white focus:ring-blue-400'
              }`}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="partially_completed">Partial</option>
              <option value="completed">Completed ✅</option>
            </select>
          )}
        </div>

        {/* Progress bar */}
        {task.status !== 'pending' && (
          <div className="mt-3">
            <div className={`flex justify-between text-xs mb-1 ${isCompleted ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
              <span>{isCompleted ? '🎉 Task Complete!' : 'Progress'}</span><span>{task.progress_percentage}%</span>
            </div>
            <div className={`w-full rounded-full h-2 ${isCompleted ? 'bg-emerald-200' : 'bg-gray-100'}`}>
              <div className={`h-2 rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`} style={{ width: `${task.progress_percentage}%` }} />
            </div>
          </div>
        )}

        {/* Audio voice notes */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 size={12} /> Voice Notes ({task.attachments.length})
            </p>
            <div className="space-y-1.5">
              {task.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2">
                  <audio src={att.file_url} controls className="h-8 w-full max-w-[280px]" />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(att.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record voice note button and Chat button */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => setOpenAudioTaskId(openAudioTaskId === task.id ? null : task.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${
              openAudioTaskId === task.id ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
            }`}>
            <Mic size={13} /> {openAudioTaskId === task.id ? 'Close Recorder' : 'Add Voice Note'}
          </button>

          <button onClick={() => setOpenChatTaskId(openChatTaskId === task.id ? null : task.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${
              openChatTaskId === task.id ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
            }`}>
            <MessageSquare size={13} /> {openChatTaskId === task.id ? 'Close Chat' : 'Chat / Messages'}
          </button>
        </div>

        {/* Inline audio recorder for existing task */}
        {openAudioTaskId === task.id && currentUser && (
          <div className="mt-3">
            <InlineAudioRecorder taskId={task.id} userId={currentUser.id} onSaved={() => loadTasks(currentUser.id)} />
          </div>
        )}

        {/* Real-time Task Chat */}
        {openChatTaskId === task.id && currentUser && (
          <TaskChat taskId={task.id} currentUser={currentUser} />
        )}
      </div>
    );
  };

  return (
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tasks.length} total tasks</p>
          </div>
          <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all">
            <Plus size={16} /> New Task
          </button>
        </div>

        {/* Filters */}
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
                        className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                            filterStatus === s ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}>
                  {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
            ))}
          </div>
        </div>

        {/* Task Columns (Differentiated and Responsive) */}
        {filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <CheckSquare className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">No tasks found. Create one!</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Column 1: Tasks Assigned to Me (Received) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="font-bold text-gray-800 text-sm md:text-base">📥 Assigned to Me (Received)</h2>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                    {tasksAssignedToMe.length}
                  </span>
                </div>
                
                {tasksAssignedToMe.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200/80">
                    <CheckSquare className="mx-auto text-gray-300 mb-2" size={36} />
                    <p className="text-gray-400 text-xs font-semibold">No tasks assigned to you</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasksAssignedToMe.map(task => renderTaskCard(task))}
                  </div>
                )}
              </div>

              {/* Column 2: Tasks I Assigned to Others (Given) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50/50 border border-purple-100 rounded-2xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <h2 className="font-bold text-gray-800 text-sm md:text-base">📤 Assigned by Me (Given)</h2>
                  </div>
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
                    {tasksAssignedByMe.length}
                  </span>
                </div>
                
                {tasksAssignedByMe.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200/80">
                    <CheckSquare className="mx-auto text-gray-300 mb-2" size={36} />
                    <p className="text-gray-400 text-xs font-semibold">No tasks assigned by you</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasksAssignedByMe.map(task => renderTaskCard(task))}
                  </div>
                )}
              </div>
            </div>
        )}

        {/* ═══════ CREATE TASK MODAL ═══════ */}
        {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Plus size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Create New Task</h2>
                      <p className="text-xs text-gray-400">Assign task with voice note</p>
                    </div>
                  </div>
                  <button onClick={resetModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task Title <span className="text-red-400">*</span></label>
                    <input type="text" required value={form.title}
                           onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                           className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                           placeholder="What needs to be done?" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea value={form.description} rows={3}
                              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                              placeholder="Add details about this task..." />
                  </div>

                  {/* Due Date + Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" /> Due Date
                      </label>
                      <div className="flex flex-col gap-2">
                        {/* Quick Presets row */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '1 Day', days: 1 },
                            { label: '2 Days', days: 2 },
                            { label: '3 Days', days: 3 },
                            { label: '4 Days', days: 4 },
                            { label: '7 Days', days: 7 },
                          ].map(preset => {
                            const dateStr = getLocalDateString(preset.days);
                            const isActive = form.due_date === dateStr;
                            return (
                              <button
                                key={preset.days}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, due_date: dateStr }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100 scale-105'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                          {form.due_date && (
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, due_date: '' }))}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all ml-auto"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <input type="date" value={form.due_date}
                                 min={getLocalDateString(0)}
                                 onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                                 className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                          <select value={form.time_hours}
                                  onChange={e => setForm(p => ({ ...p, time_hours: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="">Select hours</option>
                            <option value="0.5">30 min</option>
                            <option value="1">1 hour</option>
                            <option value="2">2 hours</option>
                            <option value="3">3 hours</option>
                            <option value="4">4 hours</option>
                            <option value="6">6 hours</option>
                            <option value="8">8 hours (1 day)</option>
                            <option value="16">16 hours (2 days)</option>
                            <option value="24">24 hours (3 days)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" /> Department <span className="text-red-400">*</span>
                </label>
                <select value={form.selectedDept} required
                  onChange={e => setForm(p => ({ ...p, selectedDept: e.target.value, selectedUsers: [] }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Select Department --</option>
                  <option value="All Departments">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Assign Members */}
              {form.selectedDept && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-gray-400" /> Assign To <span className="text-red-400">*</span>
                    </span>
                    <span className="text-xs text-gray-400 font-normal">{deptMembers.length} members</span>
                  </label>

                  {/* Selected chips */}
                  {form.selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.selectedUsers.map(uid => {
                        const m = allUsers.find(u => u.id === uid);
                        return (
                          <span key={uid} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                            <User size={11} /> {m?.full_name || m?.email}
                            <button type="button" onClick={() => toggleUser(uid)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {deptMembers.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400">No members in this department</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto">
                      {deptMembers.map(member => {
                        const selected = form.selectedUsers.includes(member.id);
                        return (
                          <button key={member.id} type="button" onClick={() => toggleUser(member.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-gray-50 ${selected ? 'bg-blue-50/60' : ''}`}>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {(member.full_name || member.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900">
                                {member.full_name || member.email || 'No name'}
                                {member.id === currentUser?.id && <span className="text-xs text-blue-500 font-normal ml-1.5">(You)</span>}
                              </p>
                              <p className="text-xs text-gray-400">{member.department || 'No Dept'} • {member.work_role || 'Member'}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-blue-500 border-blue-500 scale-110' : 'border-gray-300'}`}>
                              {selected && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── 🎤 Audio Recording Section ── */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Mic size={15} className="text-blue-500" /> Voice Note
                    <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </span>
                  {recording && (
                    <span className="flex items-center gap-1.5 text-red-500 text-xs font-semibold animate-pulse">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      {fmt(recDuration)} Recording...
                    </span>
                  )}
                  {audioBlob && !recording && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 size={13} /> Ready to send
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Record / Stop button */}
                  {!recording ? (
                    <button type="button" onClick={startRecording} disabled={!!audioBlob}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                      <Mic size={15} /> Record
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm">
                      <Square size={15} /> Stop
                    </button>
                  )}

                  {/* Playback controls */}
                  {audioUrl && !recording && (
                    <>
                      <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
                      <button type="button" onClick={togglePlay}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition-all">
                        {playing ? <Pause size={15} /> : <Play size={15} />}
                        {playing ? 'Pause' : 'Play'}
                      </button>
                      <button type="button" onClick={discardAudio}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors" title="Discard recording">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>

                {!recording && !audioBlob && (
                  <p className="text-xs text-gray-400 mt-2">Record a voice note to send with this task</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetModal}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-200 transition-all">
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Assigning...</> : <><Send size={15} /> Assign Task</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Inline Audio Recorder (for adding voice notes to existing tasks)
   ═══════════════════════════════════════════════════ */
function InlineAudioRecorder({ taskId, userId, onSaved }: { taskId: string; userId: string; onSaved: () => void }) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [recording, setRecording]   = useState(false);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [playing, setPlaying]       = useState(false);
  const [duration, setDuration]     = useState(0);
  const [uploading, setUploading]   = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setDuration(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setSaved(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setDuration(0);
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch {
      toast.error('Microphone access required');
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play();
    setPlaying(!playing);
  };
  const discardAudio = () => { setAudioBlob(null); setAudioUrl(null); setDuration(0); setSaved(false); };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const fileName = `${userId}/${taskId}-${Date.now()}.webm`;
      const { data, error } = await supabase.storage.from('task-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('task-audio').getPublicUrl(data.path);
      await supabase.from('task_attachments').insert({
        task_id: taskId, file_type: 'audio',
        file_url: pub.publicUrl, file_name: fileName, file_size: audioBlob.size,
      });
      toast.success('🎤 Voice note saved & shared!');
      setSaved(true);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Mic size={13} className="text-blue-500" /> Record Voice Note
        </span>
        {recording && (
          <span className="flex items-center gap-1.5 text-red-500 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full" /> {fmt(duration)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {!recording ? (
          <button onClick={startRecording} disabled={!!(audioBlob && !saved)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30">
            <Mic size={13} /> Record
          </button>
        ) : (
          <button onClick={stopRecording}
            className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
            <Square size={13} /> Stop
          </button>
        )}
        {audioUrl && !recording && (
          <>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
            <button onClick={togglePlay}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">
              {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? 'Pause' : 'Play'}
            </button>
            {!saved && (
              <button onClick={uploadAudio} disabled={uploading}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {uploading ? 'Saving...' : 'Send'}
              </button>
            )}
            {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} /> Sent!</span>}
            <button onClick={discardAudio} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Real-time Task Chat (Discussion / Comments)
   ═══════════════════════════════════════════════════ */
interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  users?: { full_name: string | null; email: string };
}

function TaskChat({ taskId, currentUser }: { taskId: string; currentUser: UserProfile }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchComments = async () => {
      try {
        const { data } = await supabase
          .from('task_comments')
          .select('*, users(full_name, email)')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });
        if (mounted) {
          setComments(data as Comment[] || []);
          setLoading(false);
          scrollToBottom();
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchComments();

    // Setup realtime subscription
    const channelName = `comments-${taskId}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase.channel(channelName);
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'task_comments',
      filter: `task_id=eq.${taskId}`,
    }, async (payload) => {
      // Fetch sender profile details since PostgreSQL realtime payload doesn't join tables
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', payload.new.user_id)
        .single();

      const newComment: Comment = {
        id: payload.new.id,
        task_id: payload.new.task_id,
        user_id: payload.new.user_id,
        comment: payload.new.comment,
        created_at: payload.new.created_at,
        users: userData || undefined
      };

      if (mounted) {
        setComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
        scrollToBottom();
      }
    });

    channel.subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const commentToSend = text.trim();
    setText('');

    try {
      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: currentUser.id,
        comment: commentToSend,
      });
      if (error) throw error;
    } catch (err) {
      toast.error('Failed to send message');
      setText(commentToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50/50 p-3 mt-3 flex flex-col max-h-80">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <MessageSquare size={12} className="text-blue-500" /> Task Chat Discussion
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 min-h-[120px] max-h-48 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin text-blue-500" size={20} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          comments.map((c) => {
            const isMe = c.user_id === currentUser.id;
            const senderName = c.users?.full_name || c.users?.email?.split('@')[0] || 'Unknown';
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                  isMe 
                    ? 'bg-blue-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {!isMe && (
                    <p className="font-bold text-[10px] text-blue-600 mb-0.5">
                      {senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{c.comment}</p>
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                  {new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </form>
    </div>
  );
}

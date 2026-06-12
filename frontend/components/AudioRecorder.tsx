'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AudioRecorderProps {
  taskId: string;
  userId: string;
  onSaved?: (url: string) => void;
}

export default function AudioRecorder({ taskId, userId, onSaved }: AudioRecorderProps) {
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
  const [savedAudios, setSavedAudios] = useState<{ url: string; name: string; created_at: string }[]>([]);

  // Load existing audio for this task
  useEffect(() => {
    loadAudios();
  }, [taskId]);

  const loadAudios = async () => {
    const { data } = await supabase
      .from('task_attachments')
      .select('file_url, file_name, created_at')
      .eq('task_id', taskId)
      .eq('file_type', 'audio')
      .order('created_at', { ascending: false });
    setSavedAudios(
      (data || []).map((row: any) => ({
        url: row.file_url,
        name: row.file_name,
        created_at: row.created_at,
      }))
    );
  };

  // Recording timer
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        setSaved(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setDuration(0);
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch {
      toast.error('Microphone permission required');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setSaved(false);
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const fileName = `${userId}/${taskId}-${Date.now()}.webm`;

      const { data, error } = await supabase.storage
        .from('task-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: false });

      if (error) throw error;

      const { data: pub } = supabase.storage.from('task-audio').getPublicUrl(data.path);

      // Save to task_attachments
      await supabase.from('task_attachments').insert({
        task_id: taskId,
        file_type: 'audio',
        file_url: pub.publicUrl,
        file_name: fileName,
        file_size: audioBlob.size,
      });

      // Save as comment so team can see it
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: userId,
        comment: `🎤 Voice note: ${pub.publicUrl}`,
      });

      toast.success('Voice note saved & shared!');
      setSaved(true);
      onSaved?.(pub.publicUrl);
      await loadAudios();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Recorder */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Voice Note</span>
          {recording && (
            <span className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {fmt(duration)} Recording...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Record / Stop */}
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={!!audioBlob && !saved}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <Mic size={16} /> Record
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Square size={16} /> Stop
            </button>
          )}

          {/* Playback */}
          {audioUrl && !recording && (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
              <button
                onClick={togglePlay}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? 'Pause' : 'Play'}
              </button>

              {/* Upload */}
              {!saved && (
                <button
                  onClick={uploadAudio}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Saving...' : 'Save & Share'}
                </button>
              )}

              {saved && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle2 size={16} /> Saved!
                </span>
              )}

              <button
                onClick={discardRecording}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>

        {!recording && !audioBlob && (
          <p className="text-xs text-gray-400 mt-2">Record a voice note and share it with your team</p>
        )}
      </div>

      {/* Saved voice notes for this task */}
      {savedAudios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Previous voice notes ({savedAudios.length})</p>
          {savedAudios.map((a, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mic size={15} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  {new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <audio controls src={a.url} className="h-8 max-w-[160px]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { loadNotifications, markNotificationRead } from '@/lib/data';
import type { NotificationItem } from '@/lib/types';
import toast from 'react-hot-toast';

const StyleInject = () => (
  <style>{`
    @keyframes slideDown {
      from { transform: translateY(-120%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(-120%); opacity: 0; }
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(-15deg); }
      30% { transform: rotate(15deg); }
      45% { transform: rotate(-10deg); }
      60% { transform: rotate(10deg); }
      75% { transform: rotate(-5deg); }
      90% { transform: rotate(5deg); }
    }
    .animate-wiggle {
      animation: wiggle 1.2s ease-in-out infinite;
    }
  `}</style>
);

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playTone(587.33, now, 0.4); // D5
    playTone(880, now + 0.15, 0.5); // A5
  } catch (err) {
    console.error('Audio play error:', err);
  }
};

const showNotificationToast = (notif: NotificationItem) => {
  toast.custom((t) => (
    <div
      style={{
        animation: t.visible 
          ? 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
          : 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      className="max-w-md w-[calc(100vw-2rem)] sm:w-96 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 border border-blue-50/50 hover:shadow-blue-100 transition-all duration-300 cursor-pointer"
      onClick={() => toast.dismiss(t.id)}
    >
      <div className="flex-1 w-0 flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-100 flex-shrink-0">
            <Bell size={18} className="animate-wiggle" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">New Notification</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">
            {notif.message}
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Tap to dismiss
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 flex border-l border-gray-100 ml-3 pl-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="w-full border border-transparent rounded-none rounded-r-lg p-1 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  ), {
    duration: 5000,
    position: 'top-center',
  });
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    loadNotifications(userId).then((data) => {
      if (mounted) setItems(data);
    });

    // Remove any existing channel with this name before creating a new one
    const channelName = `notif-${userId}`;
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase.channel(channelName);
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const newNotif = payload.new as NotificationItem;
      setItems((prev) => [newNotif, ...prev]);
      playNotificationSound();
      showNotificationToast(newNotif);
    });
    channel.subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = items.filter((i) => !i.is_read).length;

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((i) => !i.is_read).map((i) => i.id);
    await Promise.all(unreadIds.map(markNotificationRead));
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <StyleInject />
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[340px] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Bell size={28} className="mx-auto mb-2 text-gray-200" />
                No notifications yet
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleRead(item.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${item.is_read ? 'opacity-50' : ''}`}
                >
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{item.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Home,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  BarChart3,
  Plus,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <>
      {/* ── DESKTOP: Side Navbar ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 shadow-sm z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            SW
          </div>
          <span className="text-base font-bold text-gray-900">ShopWave</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Notification + Logout */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          {userId && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <NotificationBell userId={userId} />
              <span className="text-sm text-gray-600">Notifications</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MOBILE: Bottom Navbar (5 items only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  active ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {active && <span className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-b-full" />}
                <Icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── ADD TASK Button — top-right ── */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {userId && (
          <div className="md:hidden">
            <NotificationBell userId={userId} />
          </div>
        )}
        {pathname?.startsWith('/tasks') && (
          <Link
            href="/tasks?add=true"
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Task</span>
          </Link>
        )}
      </div>
    </>
  );
}

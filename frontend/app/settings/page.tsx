'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  });
  const [deleting, setDeleting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/auth/login');
        } else {
          const u = JSON.parse(userStr);
          setUser(u);
          setFormData({
            fullName: u.full_name || '',
            email: u.email || '',
          });
        }
      } catch (error) {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [router]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
        })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, full_name: formData.fullName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to completely delete your account? This action cannot be undone and all your tasks will be deleted.')) return;
    
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      
      localStorage.removeItem('user');
      toast.success('Account deleted successfully');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error(error.message);
      setDeleting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-20 md:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* App Settings Section */}
        {isInstallable && (
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">App Features</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Install ShopWave App</p>
                <p className="text-xs text-gray-500 mt-1">Get the full native experience on your phone.</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-md"
              >
                <Download size={18} />
                Install
              </button>
            </div>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              <Save size={20} />
              Save Changes
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-bold text-red-900 mb-4">Danger Zone</h2>
          <button 
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </main>
    </>
  );
}

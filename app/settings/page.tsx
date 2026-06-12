'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [formData, setFormData] = useState({ fullName: '', email: '' });

  useEffect(() => {
    const load = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setFormData({
          fullName: user.full_name || '',
          email: user.email || '',
        });
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const { error } = await supabase
        .from('users')
        .update({ full_name: formData.fullName })
        .eq('id', user.id);
      
      if (error) throw error;
      
      user.full_name = formData.fullName;
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input type="text" value={formData.fullName}
                onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={formData.email} disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
            </div>
            <button type="submit" className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium">
              <Save size={20} /> Save Changes
            </button>
          </form>
        </div>
      </div>
    </ProtectedLayout>
  );
}

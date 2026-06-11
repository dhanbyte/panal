'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, Briefcase, Building2 } from 'lucide-react';

const DEPARTMENTS = ['Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales'];
const ROLES = ['Member', 'Manager', 'Owner'];

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', phone: '', workRole: '', department: '',
    email: '', password: '', confirmPassword: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existing) {
        toast.error('Email already registered');
        return;
      }

      const { data, error } = await supabase.from('users').insert({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        phone: formData.phone,
        work_role: formData.workRole,
        department: formData.department,
      }).select().single();

      if (error) throw error;

      localStorage.setItem('user', JSON.stringify(data));
      toast.success('Account created! Redirecting...');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3 text-lg">
            SW
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join ShopWave Team</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" required value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Your full name" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="tel" required value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                pattern="[0-9]{10}"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="10-digit mobile" />
            </div>
          </div>

          {/* Work Role & Department - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                <select required value={formData.workRole}
                  onChange={(e) => setFormData(p => ({ ...p, workRole: e.target.value }))}
                  className="w-full pl-10 pr-2 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none">
                  <option value="">Select</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r.toLowerCase()}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 text-gray-400" size={18} />
                <select required value={formData.department}
                  onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                  className="w-full pl-10 pr-2 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none">
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="email" required value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="your@email.com" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Min 6 characters" />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={formData.confirmPassword}
                onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="••••••••" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

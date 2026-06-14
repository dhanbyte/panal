'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Phone } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.length !== 10) {
      toast.error('Please enter valid 10 digit phone number');
      return;
    }

    setLoading(true);
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error || !user) {
        toast.error('Phone number not found. Please sign up first.');
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold mx-auto mb-4 text-2xl">
            SW
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Login with your phone number</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="10 digit mobile number"
                maxLength={10}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || phone.length !== 10}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

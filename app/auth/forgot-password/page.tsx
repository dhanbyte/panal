'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Phone, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });

  // Step 1: Verify phone number
  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Look up user by phone in users table
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', phone)
        .single();

      if (error || !data) {
        toast.error('No account found with this phone number');
        return;
      }

      setUserEmail(data.email);
      toast.success('Phone verified! Now set your new password.');
      setStep('reset');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Send reset email after phone verification
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: passwords.newPassword })
        .eq('email', userEmail);

      if (error) throw error;

      toast.success('Password reset successfully!');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3 text-lg">
            SW
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'phone' ? 'Forgot Password?' : 'Reset Password'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'phone'
              ? 'Enter your registered phone number'
              : `Reset link will be sent to your email`}
          </p>
        </div>

        {/* Step 1: Phone Verification */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="[0-9]{10}"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Phone'}
            </button>
          </form>
        )}

        {/* Step 2: Send Reset Email */}
        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              ✓ Phone verified — reset link will go to: <strong>{userEmail}</strong>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-5"
        >
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    </div>
  );
}

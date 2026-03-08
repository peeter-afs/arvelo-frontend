'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { Loader2, AlertCircle, Info } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    tenant_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const session = await authApi.register({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        tenant_name: formData.tenant_name || undefined,
      });

      setSession(
        session.user,
        session.tenant || null,
        session.role || null,
        session.access_token,
        session.refresh_token
      );

      // Wait for zustand persist to save to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Start managing your finances in minutes
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Full name (optional)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="John Doe"
            disabled={isLoading}
            style={{ fontSize: '16px' }}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            disabled={isLoading}
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* Password - grouped visually with confirm password */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="At least 8 characters"
              disabled={isLoading}
              style={{ fontSize: '16px' }}
            />

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        index < passwordStrength
                          ? strengthColors[passwordStrength - 1]
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {passwordStrength > 0 && (
                  <p className="text-xs text-slate-500">
                    Password strength: {strengthLabels[passwordStrength - 1]}
                  </p>
                )}
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Use 8+ characters with a mix of letters and numbers
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Repeat your password"
              disabled={isLoading}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-start gap-2 mb-1.5">
            <label
              htmlFor="tenant_name"
              className="block text-sm font-medium text-slate-700"
            >
              Company name (optional)
            </label>
            <div className="relative group">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
              {/* Mobile: show as inline text, Desktop: show on hover */}
              <span className="hidden sm:group-hover:block absolute left-6 -top-1 w-48 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-10">
                You can always add this later
              </span>
            </div>
          </div>
          <input
            id="tenant_name"
            name="tenant_name"
            type="text"
            value={formData.tenant_name}
            onChange={handleChange}
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Your Company OÜ"
            disabled={isLoading}
            style={{ fontSize: '16px' }}
          />
          {/* Mobile helper text (instead of hover tooltip) */}
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed sm:hidden">
            You can create or join a company later
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-lg hover:shadow-[var(--primary)]/25 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Sign in
        </Link>
      </p>

      {/* Terms Text */}
      <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed pb-8">
        By signing up, you agree to our{' '}
        <a
          href="#"
          className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="#"
          className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

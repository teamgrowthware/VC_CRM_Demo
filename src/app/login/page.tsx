'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
  const roleEmailMap: Record<string, string> = {
    admin: 'admin@vortexcubes.com',
    hr: 'hr@vortexcubes.com',
    manager: 'jane@vortexcubes.com',
    project_manager: 'pm@vortexcubes.com',
    employee: 'john@vortexcubes.com',
  };
  
  const [email, setEmail] = useState(() => roleParam ? (roleEmailMap[roleParam] || '') : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { default: apiClient, setCsrfToken } = await import('@/lib/api/apiClient');
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const employee = response.data.employee;
      if (employee && employee.role) {
        localStorage.clear();
        localStorage.setItem('user', JSON.stringify(employee));
        if (response.data.csrfToken) {
          setCsrfToken(response.data.csrfToken);
        }
        toast.success(`Welcome, ${employee.name || employee.firstName || 'User'}!`);
        
        const role = employee.role;
        if (role === 'ADMIN') {
          router.push('/dashboard/admin');
        } else if (role === 'HR') {
          router.push('/dashboard/hr');
        } else if (role === 'MANAGER' || role === 'PROJECT_MANAGER') {
           router.push('/dashboard/manager');
        } else {
           router.push('/dashboard/employee');
        }
      } else {
        toast.error('Login failed: Invalid response from server');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to login';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.post('/auth/forgot-password', { email });
      toast.success(response.data.message || 'If the account exists, an OTP has been sent.');
      setMode('reset');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to request OTP';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.post('/auth/reset-password', {
        otp,
        newPassword,
      });
      toast.success(response.data.message || 'Password reset successful. Please log in.');
      setMode('login');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to reset password';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#000000] relative overflow-hidden font-sans">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-md p-8 relative z-10">
        <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          <div className="mb-10 text-center relative">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="absolute left-0 top-0 p-2 z-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              title="Back to Selection"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            
            <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <span className="text-white dark:text-black font-bold text-2xl tracking-tighter">VC</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">Sign in to your CRM dashboard</p>
          </div>

          {mode === 'login' && (
            <>
              <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Forgot your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset it
                </button>
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                A one-time password (OTP) will be sent to the registered email address.
                The OTP is valid for 10 minutes and can only be used once.
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <Mail className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">OTP</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                    placeholder="6-digit OTP"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                    placeholder="At least 8 chars, upper, lower & number"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Change Password
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#000000] relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md p-8 relative z-10">
          <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-3xl p-8 shadow-2xl animate-pulse">
            <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl mx-auto mb-6" />
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4 mx-auto mb-4" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/2 mx-auto mb-10" />
            <div className="space-y-6">
              <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
              <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
              <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full mt-8" />
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

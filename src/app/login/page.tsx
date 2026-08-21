'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/layout/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
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

      if (response.data.employee) {
        localStorage.removeItem('user');
        localStorage.setItem('user', JSON.stringify(response.data.employee));
        if (response.data.csrfToken) {
          setCsrfToken(response.data.csrfToken);
        }
        toast.success('Login successful!');
        
        const role = response.data.employee.role;
        if (role === 'ADMIN') {
          router.push('/dashboard/admin');
        } else if (role === 'HR') {
          router.push('/dashboard/hr');
        } else if (role === 'MANAGER' || role === 'PROJECT_MANAGER') {
           router.push('/dashboard/manager');
        } else {
           router.push('/dashboard/employee');
        }
      }
    } catch (thrown) { const error = thrown as ApiError;
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
      const response = await apiClient.post('/auth/forgot-password');
      toast.success(response.data.message || 'If the account exists, an OTP has been sent.');
      setMode('reset');
    } catch (thrown) { const error = thrown as ApiError;
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
    } catch (thrown) { const error = thrown as ApiError;
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to reset password';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[15%] w-[50%] h-[50%] bg-gradient-to-br from-indigo-500/15 to-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="w-full max-w-md p-8 relative z-10">
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl shadow-black/5 dark:shadow-black/30">
          <div className="mb-10 text-center relative">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="absolute left-0 top-0 p-2 z-50 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
              title="Back to Selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-0 z-50">
              <ThemeToggle />
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-bold text-2xl tracking-tighter">VC</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">Sign in to your CRM dashboard</p>
          </div>

          {mode === 'login' && (
            <>
              <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                      placeholder="Enter your password"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-70"
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

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Forgot your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="font-medium text-primary hover:underline"
                >
                  Reset it
                </button>
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A one-time password (OTP) will be sent to the registered admin email address.
                The OTP is valid for 10 minutes and can only be used once.
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-70"
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
                className="w-full text-center text-sm font-medium text-primary hover:underline"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">OTP</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                    placeholder="6-digit OTP"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                    placeholder="At least 8 chars, upper, lower & number"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-70"
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
                className="w-full text-center text-sm font-medium text-primary hover:underline"
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
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 relative z-10">
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl animate-pulse">
            <div className="w-16 h-16 bg-muted rounded-2xl mx-auto mb-6" />
            <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto mb-4" />
            <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto mb-10" />
            <div className="space-y-6">
              <div className="h-12 bg-muted rounded-xl w-full" />
              <div className="h-12 bg-muted rounded-xl w-full" />
              <div className="h-12 bg-muted rounded-xl w-full mt-8" />
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

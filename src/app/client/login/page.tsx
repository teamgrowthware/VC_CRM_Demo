'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/layout/ThemeToggle';

function ClientLoginForm() {
  const router = useRouter();
  
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('clientUser');
    if (user) {
      router.push('/client/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { default: apiClient, setCsrfToken } = await import('@/lib/api/apiClient');
      const response = await apiClient.post('/auth/client-login', {
        clientId,
        password,
      });

      if (response.data.client) {
        localStorage.removeItem('clientUser');
        localStorage.setItem('clientUser', JSON.stringify(response.data.client));
        if (response.data.csrfToken) {
          setCsrfToken(response.data.csrfToken);
        }
        toast.success('Login successful!');
        router.push('/client/dashboard');
      }
    } catch (thrown) { const error = thrown as ApiError;
      console.error("Client login error:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to login';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[15%] w-[50%] h-[50%] bg-gradient-to-br from-cyan-500/15 to-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] bg-gradient-to-tl from-indigo-500/15 to-purple-500/10 rounded-full blur-[120px]" />
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
            
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <span className="text-white font-bold text-2xl tracking-tighter">VC</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Client Portal
            </h1>
            <p className="text-muted-foreground">Sign in to view your projects</p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Client ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground text-foreground"
                  placeholder="e.g. CL001"
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
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-70"
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
        </div>
      </main>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ClientLoginForm />
    </Suspense>
  );
}

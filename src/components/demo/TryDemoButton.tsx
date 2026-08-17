'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function TryDemoButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleTryDemo = async () => {
    setIsLoading(true);
    try {
      const { API_URL } = await import('@/lib/api/apiClient');
      const response = await axios.post(`${API_URL}/demo/login`);
      if (response.data.token) {
        localStorage.clear();
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.employee));
        toast.success('Logged into demo environment!');
        router.push('/dashboard/admin');
      } else {
        toast.error('Demo login failed');
      }
    } catch (error: unknown) {
      console.error('Demo login error:', error);
      const e = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const errorMessage = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed to login to demo';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTryDemo}
      disabled={isLoading}
      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 disabled:opacity-70"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Setting up demo...
        </>
      ) : (
        <>
          <Play className="w-5 h-5 fill-current" />
          Try Demo - One Click Login
        </>
      )}
    </button>
  );
}

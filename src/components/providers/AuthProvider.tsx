'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/lib/api/apiClient';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Setup Axios interceptor globally for client side
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          localStorage.removeItem('user');
          if (!pathname.startsWith('/login')) {
            router.push('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    const checkAuth = async () => {
      if (pathname.startsWith('/login') || pathname.startsWith('/client/login')) {
        setIsReady(true);
        return;
      }
      const existing = localStorage.getItem('user');
      if (!existing) {
        if (!pathname.startsWith('/login')) {
          router.push('/login');
        }
        setIsReady(true);
        return;
      }
      try {
        const parsed = JSON.parse(existing);
        if (!parsed || !parsed.role) {
          localStorage.removeItem('user');
          router.push('/login');
        }
      } catch {
        localStorage.removeItem('user');
        router.push('/login');
      }
      setIsReady(true);
    };

    checkAuth();

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router, pathname]);

  if (!isReady && !pathname.startsWith('/login')) {
     return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return <>{children}</>;
}

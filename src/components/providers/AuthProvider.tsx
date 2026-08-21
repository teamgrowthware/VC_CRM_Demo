'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import apiClient, { clearAuthStorage } from '@/lib/api/apiClient';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Setup Axios interceptor globally for client side
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearAuthStorage();
          if (!pathname.startsWith('/login')) {
            router.push('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    // Validate the session against the backend using the httpOnly cookie.
    const checkAuth = async () => {
      if (pathname.startsWith('/login')) {
        setIsReady(true);
        return;
      }
      try {
        const { data } = await apiClient.get('/auth/me');
        if (data.employee) {
          localStorage.setItem('user', JSON.stringify(data.employee));
        }
        setIsReady(true);
      } catch (thrown) { const err = thrown as ApiError;
        if (err.response?.status === 401) {
          clearAuthStorage();
          router.push('/login');
        } else {
          setIsReady(true);
        }
      }
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

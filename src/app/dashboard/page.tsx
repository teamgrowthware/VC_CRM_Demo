'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function DashboardIndex() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role) {
      const role = user.role.toLowerCase();
      const redirectPath = role === 'project_manager' ? 'manager' : role;
      router.push(`/dashboard/${redirectPath}`);
    }
  }, [user, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
    </div>
  );
}

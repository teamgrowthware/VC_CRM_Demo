'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user) {
      if (allowedRoles.includes(user.role)) {
        setIsReady(true);
      } else {
        // Redirect unauthorized user to their specific dashboard
        const role = user.role.toLowerCase();
        const redirectPath = role === 'project_manager' ? 'manager' : role;
        router.push(`/dashboard/${redirectPath}`);
      }
    }
  }, [user, allowedRoles, router]);

  if (!isReady || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 w-full h-full pb-32">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';

export default function ManagerDashboard() {
  return (
    <RoleGuard allowedRoles={['MANAGER', 'PROJECT_MANAGER']}>
      <OverviewDashboard />
    </RoleGuard>
  );
}

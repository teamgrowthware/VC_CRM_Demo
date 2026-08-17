'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import HRDashboardCore from '@/components/dashboard/hr/HRDashboardCore';

export default function HRDashboard() {
  return (
    <RoleGuard allowedRoles={['HR', 'MANAGER']}>
      <HRDashboardCore />
    </RoleGuard>
  );
}

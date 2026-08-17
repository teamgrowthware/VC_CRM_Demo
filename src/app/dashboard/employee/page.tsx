'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';

export default function EmployeeDashboard() {
  return (
    <RoleGuard allowedRoles={['EMPLOYEE']}>
      <OverviewDashboard />
    </RoleGuard>
  );
}

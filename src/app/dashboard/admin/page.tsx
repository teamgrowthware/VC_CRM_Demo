'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import AdminDashboardCore from '@/components/dashboard/admin/AdminDashboardCore';

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <AdminDashboardCore />
    </RoleGuard>
  );
}




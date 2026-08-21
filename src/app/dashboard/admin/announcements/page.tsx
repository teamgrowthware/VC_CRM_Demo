'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import AnnouncementsManagement from '@/components/dashboard/admin/AnnouncementsManagement';

export default function AnnouncementsPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'HR']}>
      <AnnouncementsManagement />
    </RoleGuard>
  );
}

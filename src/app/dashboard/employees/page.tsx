import { EmployeeManager } from '@/components/employees/EmployeeManager';
import { Metadata } from 'next';
import RoleGuard from '@/components/auth/RoleGuard';

export const metadata: Metadata = {
  title: 'Employee Management | Vortex Cubes CRM',
  description: 'Manage employees, their roles, departments, and statuses efficiently.',
};

export default function EmployeesPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER']}>
      <div className="flex flex-col min-h-full w-full">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Employee Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your team members, assign departments, and track statuses from a unified dashboard.
          </p>
        </div>

        <div className="flex-1 min-h-[500px] w-full bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <EmployeeManager />
        </div>
      </div>
    </RoleGuard>
  );
}

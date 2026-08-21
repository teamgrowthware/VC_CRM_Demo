'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateEmployee } from '@/lib/api/employee';
import type { Employee } from '@/types/employee';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DateInput } from '@/components/ui/DateInput';

const editEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  role: z.enum(['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']),
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  baseSalary: z.string().optional(),
});

type FormData = z.infer<typeof editEmployeeSchema>;

export const EditEmployeeModal = ({ employee, onClose, onSuccess }: { employee: Employee, onClose: () => void, onSuccess: () => void }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departments = [
    { id: 'dept_1', name: 'IT department' },
    { id: 'dept_2', name: 'Human Resources' },
    { id: 'dept_3', name: 'Sales' },
    { id: 'dept_4', name: 'Marketing' },
    { id: 'dept_5', name: 'Management' },
    { id: 'dept_6', name: 'BDE' },
  ];

  const commonDesignations = [
    'HR', 'Management', 'Admin', 'Developer', 'BDE', 'Testing', 'Software Engineer', 'Senior Developer', 'Project Manager'
  ];

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      departmentId: employee.departmentId || '',
      designation: employee.designation,
      role: employee.role,
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      baseSalary: employee.baseSalary ? String(employee.baseSalary) : '',
    }
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canSetSalary = isAdmin || employee.role === 'EMPLOYEE';

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      setIsSubmitting(true);

      const payload = {
        ...data,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined
      };

      await updateEmployee(employee.id, payload);
      onSuccess();
    } catch (thrown) { const err = thrown as ApiError;
      setError(err?.response?.data?.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold">Edit Employee</h2>
            <p className="text-xs text-zinc-500">ID: {employee.employeeId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          {error && <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <input 
                {...register('name')} 
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent transition-all"
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email Address</label>
              <input 
                {...register('email')} 
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent transition-all"
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Phone Number</label>
              <input 
                {...register('phone')} 
                type="text"
                maxLength={10}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                }}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent transition-all"
              />
              {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Department</label>
              <select 
                {...register('departmentId')}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
              >
                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && <span className="text-xs text-red-500">{errors.departmentId.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Designation</label>
              <input 
                {...register('designation')} 
                list="edit-designations"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
                placeholder="Type or select..."
              />
              <datalist id="edit-designations">
                {commonDesignations.map(d => <option key={d} value={d} />)}
              </datalist>
              {errors.designation && <span className="text-xs text-red-500">{errors.designation.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Role</label>
              <select 
                {...register('role')}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-all"
              >
                <option value="EMPLOYEE" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Employee</option>
                <option value="PROJECT_MANAGER" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Project Manager</option>
                <option value="MANAGER" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Manager</option>
                <option value="HR" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">HR</option>
                <option value="ADMIN" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Admin</option>
              </select>
              {errors.role && <span className="text-xs text-red-500">{errors.role.message}</span>}
            </div>

            {canSetSalary && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Base Salary (Monthly)</label>
                <input 
                  type="number"
                  {...register('baseSalary')} 
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent transition-all"
                />
                {errors.baseSalary && <span className="text-xs text-red-500">{errors.baseSalary.message}</span>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Joining Date</label>
              <Controller
                name="joiningDate"
                control={control}
                render={({ field }) => (
                  <DateInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    required={true}
                  />
                )}
              />
              {errors.joiningDate && <span className="text-xs text-red-500">{errors.joiningDate.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Date of Birth</label>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DateInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    required={false}
                  />
                )}
              />
              {errors.dateOfBirth && <span className="text-xs text-red-500">{errors.dateOfBirth.message}</span>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 font-medium bg-black dark:bg-zinc-100 text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center min-w-[100px]"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

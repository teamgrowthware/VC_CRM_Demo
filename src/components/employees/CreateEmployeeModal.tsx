'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployee } from '@/lib/api/employee';
import { X, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { DateInput } from '@/components/ui/DateInput';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be valid').optional(),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  role: z.enum(['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']),
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  baseSalary: z.string().optional(),
});

type FormData = z.infer<typeof employeeSchema>;

export const CreateEmployeeModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<{ id: string, employeeId: string } | null>(null);

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

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'EMPLOYEE' }
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const selectedRole = watch('role');
  const canSetSalary = isAdmin || selectedRole === 'EMPLOYEE';

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      setIsSubmitting(true);
      
      const payload = {
        ...data,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined
      };
      
      const res = await createEmployee(payload);
      if (res?.id) {
        setCreatedEmployee({ id: res.id, employeeId: res.employeeId });
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdEmployee) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold italic tracking-tight">Employee Created!</h2>
            <p className="text-zinc-500 text-sm">New account has been provisioned successfully.</p>
          </div>
          
          <div className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
             <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Employee ID</span>
             <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{createdEmployee.employeeId}</span>
          </div>

          <div className="flex flex-col w-full gap-2">
            <Link 
              href={`/dashboard/employees/${createdEmployee.id}`}
              className="w-full py-2.5 bg-black dark:bg-zinc-100 text-white dark:text-black rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              View Full Profile
            </Link>
            <button 
              onClick={onSuccess}
              className="w-full py-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-medium"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Add New Employee</h2>
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
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent"
                placeholder="John Doe"
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email Address</label>
              <input 
                {...register('email')} 
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent"
                placeholder="john@example.com"
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Phone Number</label>
              <input 
                {...register('phone')} 
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent"
                placeholder="+1 234 567 890"
              />
              {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Department</label>
              <select 
                {...register('departmentId')}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
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
                list="designations"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                placeholder="Type or select..."
              />
              <datalist id="designations">
                {commonDesignations.map(d => <option key={d} value={d} />)}
              </datalist>
              {errors.designation && <span className="text-xs text-red-500">{errors.designation.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Role</label>
              <select 
                {...register('role')}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
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
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent"
                  placeholder="e.g. 50000"
                />
                {errors.baseSalary && <span className="text-xs text-red-500">{errors.baseSalary.message}</span>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Joining Date</label>
              <Controller
                name="joiningDate"
                control={control}
                defaultValue={new Date().toISOString().split('T')[0]}
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
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


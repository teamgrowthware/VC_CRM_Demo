export type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'PROJECT_MANAGER' | 'EMPLOYEE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  departmentId?: string;
  department?: Department;
  designation: string;
  phone?: string;
  avatarUrl?: string | null;
  joiningDate: string;
  dateOfBirth?: string;
  role: Role;
  status: EmployeeStatus;
  baseSalary?: number;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  departmentId: string;
  designation: string;
  role: Role;
  joiningDate?: string;
  dateOfBirth?: string;
}

export interface UpdateEmployeeData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  avatarUrl?: string | null;
  departmentId?: string;
  designation?: string;
  role?: Role;
  status?: EmployeeStatus;
  joiningDate?: string;
  dateOfBirth?: string;
  baseSalary?: number;
}

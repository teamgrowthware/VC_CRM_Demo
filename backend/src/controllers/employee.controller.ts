import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

interface AuthRequest extends Request {
  user?: any;
}

// Zod Schema for Validation
const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phone: z.string().min(10, 'Phone number should be valid').optional(),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  role: z.enum(['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  joiningDate: z.string().optional(),
  baseSalary: z.number().optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);
    if (validatedData.email) {
      validatedData.email = validatedData.email.toLowerCase().trim();
    }

    // Prevent duplicate email
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: validatedData.email },
    });
    if (existingEmployee) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }

    if (validatedData.baseSalary !== undefined) {
      if (req.user.role !== 'ADMIN' && validatedData.role !== 'EMPLOYEE') {
        res.status(403).json({ success: false, message: 'Only Admins can set salary for non-employee roles' });
        return;
      }
    }

    // Auto-generate employeeId (e.g., VC001, VC002)
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeId: 'desc' },
    });
    let nextIdNumber = 1;
    if (lastEmployee && lastEmployee.employeeId.startsWith('VC')) {
      const match = lastEmployee.employeeId.match(/\d+$/);
      if (match) {
        nextIdNumber = parseInt(match[0], 10) + 1;
      }
    }
    const generatedEmployeeId = `VC${nextIdNumber.toString().padStart(3, '0')}`;

    // Hash password (use default if not provided)
    const password = validatedData.password || 'Vortex@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.employee.create({
      data: {
        employeeId: generatedEmployeeId,
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone,
        departmentId: validatedData.departmentId,
        designation: validatedData.designation,
        role: validatedData.role,
        joiningDate: validatedData.joiningDate ? new Date(validatedData.joiningDate) : new Date(),
        baseSalary: validatedData.baseSalary,
      },
      include: {
        department: true,
      },
    });

    const { password: _, ...employeeData } = newEmployee;

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employeeData,
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create employee' });
    }
  }
};

export const getAllEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let filter: any = {};
    if (req.user.role === 'EMPLOYEE') {
      filter = { id: req.user.id };
    }

    const employees = await prisma.employee.findMany({
      where: filter,
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true, // Includes department relation
        departmentId: true,
        designation: true,
        role: true,
        status: true,
        joiningDate: true,
        phone: true,
        baseSalary: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Employees fetched successfully',
      data: employees,
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

export const getEmployeeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Role checks
    if (req.user.role === 'EMPLOYEE' && req.user.id !== id) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        attendance: { take: 5, orderBy: { date: 'desc' } },
        managedProjects: { take: 5, orderBy: { createdAt: 'desc' } },
        projectMembers: { include: { project: true }, take: 5 },
        tasks: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    // Managed Check removed: Managers are now treated as Management Heads with full access to HR data.


    const { password, ...employeeData } = employee;

    res.status(200).json({
      success: true,
      message: 'Employee fetched successfully',
      data: employeeData,
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validatedData = updateEmployeeSchema.parse(req.body);
    if (validatedData.email) {
      validatedData.email = validatedData.email.toLowerCase().trim();
    }

    const targetEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!targetEmployee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    // Protection: Non-Admins cannot edit sensitive roles (ADMIN, HR, MANAGER)
    if (req.user.role !== 'ADMIN') {
      // 1. Cannot edit others' sensitive profiles
      if (req.user.id !== id && ['ADMIN', 'HR', 'MANAGER'].includes(targetEmployee.role)) {
        res.status(403).json({ success: false, message: 'Unauthorized: Only Admins can modify sensitive profiles (Admin, HR, Manager)' });
        return;
      }

      // 2. Cannot promote anyone to sensitive roles
      if (validatedData.role && ['ADMIN', 'HR', 'MANAGER'].includes(validatedData.role)) {
        res.status(403).json({ success: false, message: 'Unauthorized: Only Admins can assign sensitive roles' });
        return;
      }
    }

    if (validatedData.baseSalary !== undefined) {
      if (req.user.role !== 'ADMIN') {
        if (targetEmployee.role !== 'EMPLOYEE') {
          res.status(403).json({ success: false, message: 'Only Admins can update salary for non-employee roles' });
          return;
        }
      }
    }

    // Prevent duplicate email
    if (validatedData.email) {
      const existingEmployee = await prisma.employee.findUnique({ where: { email: validatedData.email } });
      if (existingEmployee && existingEmployee.id !== id) {
        res.status(400).json({ success: false, message: 'Email already exists' });
        return;
      }
    }

    const updateData: any = { ...validatedData };
    if (updateData.joiningDate) {
      updateData.joiningDate = new Date(updateData.joiningDate);
    } else if (updateData.joiningDate === '') {
      delete updateData.joiningDate;
    }
    
    if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { department: true }
    });
    
    const { password: _, ...employeeData } = updatedEmployee;

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employeeData,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
  }
};

export const toggleEmployeeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: { status: newStatus },
      select: {
          id: true,
          status: true,
          employeeId: true
      }
    });

    res.status(200).json({
      success: true,
      message: `Employee status changed to ${newStatus}`,
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Toggle employee status error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle employee status' });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.status(200).json({ success: true, message: 'Employee deactivated successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate employee' });
  }
};

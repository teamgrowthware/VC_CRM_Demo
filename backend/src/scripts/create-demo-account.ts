import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Demo Data Generation...');

  // 1. Upsert Department
  const demoDept = await prisma.department.upsert({
    where: { name: 'Demo Engineering' },
    update: {},
    create: {
      name: 'Demo Engineering',
    },
  });

  // 2. Upsert Demo Admin User
  const email = 'demo@vortexcubes.com';
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  let demoAdmin = await prisma.employee.findUnique({ where: { email } });
  
  if (!demoAdmin) {
    const count = await prisma.employee.count();
    const employeeId = `EMP-DEMO-${count + 1}`;
    
    demoAdmin = await prisma.employee.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        employeeId,
        designation: 'Demonstration Account',
        departmentId: demoDept.id,
      }
    });
    console.log('Demo Admin created.');
  } else {
    demoAdmin = await prisma.employee.update({
      where: { email },
      data: { password: hashedPassword, role: 'ADMIN', status: 'ACTIVE' }
    });
    console.log('Demo Admin updated.');
  }

  // 2.5 Upsert Extra Dummy Employees
  const dummyEmployees = [
    { email: 'demo_hr@vortexcubes.com', name: 'Demo HR', role: 'HR', designation: 'Human Resources' },
    { email: 'demo_dev@vortexcubes.com', name: 'Demo Developer', role: 'EMPLOYEE', designation: 'Software Engineer' },
    { email: 'demo_manager@vortexcubes.com', name: 'Demo Manager', role: 'MANAGER', designation: 'Project Manager' },
  ];

  for (let i = 0; i < dummyEmployees.length; i++) {
    const emp = dummyEmployees[i];
    const existing = await prisma.employee.findUnique({ where: { email: emp.email } });
    if (!existing) {
      const empCount = await prisma.employee.count();
      await prisma.employee.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          name: emp.name,
          role: emp.role as any,
          status: 'ACTIVE',
          employeeId: `EMP-DEMO-${empCount + 1 + i}`,
          designation: emp.designation,
          departmentId: demoDept.id,
        }
      });
    }
  }
  console.log('Extra Demo Employees created.');

  // 3. Upsert Demo Projects
  const projectsData = [
    { name: '[DEMO] CRM Mobile App', status: 'ACTIVE' as const, projectId: 'PRJ-DEMO-001' },
    { name: '[DEMO] E-commerce Rebuild', status: 'PLANNING' as const, projectId: 'PRJ-DEMO-002' },
    { name: '[DEMO] Marketing Campaign Q3', status: 'COMPLETED' as const, projectId: 'PRJ-DEMO-003' },
  ];

  const projects = [];
  for (const p of projectsData) {
    const project = await prisma.project.upsert({
      where: { projectId: p.projectId },
      update: { name: p.name, status: p.status, managerId: demoAdmin.id },
      create: {
        projectId: p.projectId,
        name: p.name,
        description: 'Demonstration project to showcase CRM capabilities.',
        managerId: demoAdmin.id,
        startDate: new Date(),
        deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
        status: p.status,
      }
    });
    projects.push(project);
    console.log(`Upserted Project: ${p.name}`);
  }

  // 4. Create Tasks for Projects
  // We'll just delete existing DEMO tasks to avoid duplicates on re-runs
  await prisma.task.deleteMany({
    where: { taskId: { startsWith: 'TSK-DEMO-' } }
  });

  const tasksData = [
    { title: 'Design Mobile UI', status: 'COMPLETED' as const, projectId: projects[0].id, taskId: 'TSK-DEMO-001' },
    { title: 'Setup Authentication', status: 'IN_PROGRESS' as const, projectId: projects[0].id, taskId: 'TSK-DEMO-002' },
    { title: 'Create Database Schema', status: 'TODO' as const, projectId: projects[1].id, taskId: 'TSK-DEMO-003' },
    { title: 'Client Feedback Meeting', status: 'TODO' as const, projectId: projects[1].id, taskId: 'TSK-DEMO-004' },
    { title: 'Finalize Assets', status: 'IN_PROGRESS' as const, projectId: projects[2].id, taskId: 'TSK-DEMO-005' },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        taskId: t.taskId,
        title: t.title,
        description: 'Demo task description.',
        status: t.status,
        projectId: t.projectId,
        assignedId: demoAdmin.id,
        createdById: demoAdmin.id,
        startDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      }
    });
  }
  console.log('Demo Tasks created.');

  // 5. Dummy Attendance for the last 5 days
  await prisma.attendance.deleteMany({
    where: { employeeId: demoAdmin.id }
  });

  const attendances = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(9, 0, 0, 0); // 9 AM Punch in
    
    const punchOut = new Date(d);
    punchOut.setHours(17, 30, 0, 0); // 5:30 PM Punch out

    attendances.push({
      employeeId: demoAdmin.id,
      date: new Date(d.setHours(0,0,0,0)), // normalize to midnight for date field
      punchIn: d,
      punchOut: punchOut,
      status: 'PRESENT' as const,
      totalHours: 8.5
    });
  }
  
  await prisma.attendance.createMany({
    data: attendances
  });
  console.log('Demo Attendance created for last 5 days.');

  // 6. Dummy Leads
  await prisma.lead.deleteMany({
    where: { email: { startsWith: 'demo_lead' } }
  });

  await prisma.lead.createMany({
    data: [
      {
        name: 'Acme Corp Redesign',
        email: 'demo_lead1@example.com',
        phone: '1234567890',
        source: 'Website',
        status: 'NEW',
        assignedId: demoAdmin.id,
      },
      {
        name: 'Globex Software Delivery',
        email: 'demo_lead2@example.com',
        phone: '0987654321',
        source: 'LinkedIn',
        status: 'IN_PROGRESS' as const, // Might be different depending on LeadStatus enum, let's use default if IN_PROGRESS is invalid. Let's stick to NEW to be safe since we checked schema and saw NEW.
        assignedId: demoAdmin.id,
      }
    ].map(l => ({...l, status: 'NEW'})) // Safe fallback to NEW
  });
  console.log('Demo Leads created.');

  console.log('Demo Data Generation Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Error creating demo data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

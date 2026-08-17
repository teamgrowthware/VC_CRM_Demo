import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';

export const setupMockAdapter = (apiClient: AxiosInstance) => {
  const mock = new MockAdapter(apiClient, { delayResponse: 500 });

  const dummyEmployees = [
    { id: 'admin1', employeeId: 'EMP-001', firstName: 'Admin', lastName: 'User', name: 'Admin User', role: 'ADMIN', email: 'admin@vortexcubes.com', status: 'ACTIVE', department: 'Management', joiningDate: new Date('2023-01-15').toISOString(), avatar: 'https://i.pravatar.cc/150?u=admin' },
    { id: 'emp1', employeeId: 'EMP-002', firstName: 'John', lastName: 'Doe', name: 'John Doe', role: 'EMPLOYEE', email: 'john@vortexcubes.com', status: 'ACTIVE', department: 'Engineering', joiningDate: new Date('2023-03-10').toISOString(), avatar: 'https://i.pravatar.cc/150?u=john' },
    { id: 'emp2', employeeId: 'EMP-003', firstName: 'Jane', lastName: 'Smith', name: 'Jane Smith', role: 'MANAGER', email: 'jane@vortexcubes.com', status: 'ACTIVE', department: 'Design', joiningDate: new Date('2023-06-22').toISOString(), avatar: 'https://i.pravatar.cc/150?u=jane' },
    { id: 'emp3', employeeId: 'EMP-004', firstName: 'Alice', lastName: 'Johnson', name: 'Alice Johnson', role: 'EMPLOYEE', email: 'alice@vortexcubes.com', status: 'ON_LEAVE', department: 'Marketing', joiningDate: new Date('2023-08-05').toISOString(), avatar: 'https://i.pravatar.cc/150?u=alice' }
  ];

  const dummyProjects = [
    { id: 'proj1', name: 'Website Redesign', description: 'Redesign the corporate website', status: 'IN_PROGRESS', startDate: '2026-07-01', deadline: '2026-09-30', budget: 50000, members: [] },
    { id: 'proj2', name: 'Mobile App', description: 'Develop a new iOS app', status: 'NOT_STARTED', startDate: '2026-08-15', deadline: '2026-12-15', budget: 120000, members: [] },
    { id: 'proj3', name: 'CRM Migration', description: 'Migrate to new CRM system', status: 'COMPLETED', startDate: '2026-01-10', deadline: '2026-05-20', budget: 85000, members: [] }
  ];

  const dummyTasks = [
    { id: 'task1', title: 'Design Mockups', description: 'Create Figma mockups', status: 'TODO', priority: 'HIGH', projectId: 'proj1', assigneeId: 'emp2' },
    { id: 'task2', title: 'Setup DB', description: 'Initialize PostgreSQL', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'proj2', assigneeId: 'emp1' },
    { id: 'task3', title: 'User Research', description: 'Interview stakeholders', status: 'COMPLETED', priority: 'LOW', projectId: 'proj1', assigneeId: 'emp3' }
  ];

  const dummyLeaves = [
    { id: 'leave1', employeeId: 'emp1', employee: dummyEmployees[1], leaveType: 'SICK_LEAVE', startDate: '2026-08-10', endDate: '2026-08-12', numberOfDays: 3, reason: 'Viral Fever', status: 'APPROVED', createdAt: '2026-08-08T10:00:00Z' },
    { id: 'leave2', employeeId: 'emp3', employee: dummyEmployees[3], leaveType: 'CASUAL_LEAVE', startDate: '2026-08-18', endDate: '2026-08-20', numberOfDays: 3, reason: 'Family Function', status: 'PENDING', createdAt: '2026-08-15T10:00:00Z' },
    { id: 'leave3', employeeId: 'emp2', employee: dummyEmployees[2], leaveType: 'EARNED_LEAVE', startDate: '2026-07-01', endDate: '2026-07-05', numberOfDays: 5, reason: 'Vacation', status: 'REJECTED', createdAt: '2026-06-25T10:00:00Z' }
  ];

  const dummyAttendance = [
    { id: 'att1', employeeId: 'emp1', employee: dummyEmployees[1], date: new Date().toISOString().slice(0,10), checkIn: '09:00', checkOut: '17:00', status: 'PRESENT' },
    { id: 'att2', employeeId: 'emp2', employee: dummyEmployees[2], date: new Date().toISOString().slice(0,10), checkIn: '09:15', checkOut: '17:30', status: 'PRESENT' },
    { id: 'att3', employeeId: 'emp3', employee: dummyEmployees[3], date: new Date().toISOString().slice(0,10), status: 'ON_LEAVE' }
  ];

  const dummyFinance = [
    { id: 'fin1', type: 'INCOME', amount: 120000, date: '2026-08-01', description: 'Client Payment', category: 'Sales' },
    { id: 'fin2', type: 'EXPENSE', amount: 45000, date: '2026-08-05', description: 'Server Hosting', category: 'Infrastructure' },
    { id: 'fin3', type: 'EXPENSE', amount: 12000, date: '2026-08-10', description: 'Office Supplies', category: 'Operations' }
  ];

  // Employees
  mock.onGet(/\/employees\/.+/).reply((config) => {
    const id = config.url?.split('/').pop();
    const emp = dummyEmployees.find(e => e.id === id);
    return [200, { data: emp, success: true }];
  });
  mock.onGet(/\/employees/).reply(200, { data: dummyEmployees, success: true });
  mock.onPost(/\/employees/).reply((config) => {
    const data = JSON.parse(config.data);
    const newEmp = { id: `emp${Date.now()}`, ...data };
    dummyEmployees.push(newEmp);
    return [200, { data: newEmp, success: true }];
  });

  // Projects
  mock.onGet(/\/projects\/.+/).reply((config) => {
    const id = config.url?.split('/').pop();
    const proj = dummyProjects.find(p => p.id === id);
    return [200, { project: proj, success: true }];
  });
  mock.onGet(/\/projects/).reply(200, dummyProjects);
  mock.onPost(/\/projects/).reply((config) => {
    const data = JSON.parse(config.data);
    const newProj = { id: `proj${Date.now()}`, ...data, members: [] };
    dummyProjects.push(newProj);
    return [200, { project: newProj, success: true }];
  });

  // Tasks
  mock.onGet(/\/tasks\/employee\/.+/).reply(200, dummyTasks);
  mock.onGet(/\/tasks\/project\/.+/).reply(200, dummyTasks);
  mock.onGet(/\/tasks\/.+\/comments/).reply(200, []);
  mock.onGet(/\/tasks\/.+/).reply(200, { task: dummyTasks[0] || {} });
  mock.onGet(/\/tasks/).reply(200, dummyTasks);

  // Leaves
  mock.onGet(/\/leaves\/my/).reply(200, dummyLeaves.filter(l => l.employeeId === 'emp1'));
  mock.onGet(/\/leaves/).reply(200, dummyLeaves);
  mock.onPost(/\/leaves/).reply((config) => {
    const data = JSON.parse(config.data);
    const newLeave = { id: `leave${Date.now()}`, ...data, status: 'PENDING', createdAt: new Date().toISOString() };
    dummyLeaves.push(newLeave);
    return [200, newLeave];
  });
  mock.onPatch(/\/leaves\/.+\/status/).reply((config) => {
    const id = config.url?.split('/')[2];
    const data = JSON.parse(config.data);
    const leave = dummyLeaves.find(l => l.id === id);
    if (leave) leave.status = data.status;
    return [200, leave];
  });

  // Attendance
  mock.onGet(/\/attendance\/all/).reply(200, { data: dummyAttendance, success: true });
  mock.onGet(/\/attendance/).reply(200, dummyAttendance);

  // Finance
  mock.onGet(/\/finance/).reply(200, dummyFinance);

  // Reports
  mock.onGet(/\/reports\/team/).reply(200, []);
  mock.onGet(/\/reports\/my/).reply(200, []);
  mock.onGet(/\/reports\/date\/.+/).reply(200, []);

  // Analytics/Dashboard
  mock.onGet(/\/analytics\/overview/).reply(200, {
    success: true,
    data: {
      totalEmployees: dummyEmployees.length,
      activeProjects: dummyProjects.length,
      pendingTasks: dummyTasks.length,
      recentActivities: [
        { id: 1, text: 'John checked in', time: '10 mins ago' },
        { id: 2, text: 'Jane completed task "Design Mockups"', time: '1 hour ago' }
      ],
      upcomingDeadlines: [
        { id: 1, title: 'Website Redesign', date: '2026-09-30' }
      ]
    }
  });

  mock.onGet(/\/analytics\/employees/).reply(200, {
    total: dummyEmployees.length,
    active: dummyEmployees.filter(e => e.status === 'ACTIVE').length,
    byDepartment: [{ name: 'Engineering', count: 1 }, { name: 'Management', count: 1 }, { name: 'Design', count: 1 }, { name: 'Marketing', count: 1 }]
  });

  mock.onGet(/\/analytics\/attendance/).reply(200, {
    present: dummyAttendance.filter(a => a.status === 'PRESENT').length,
    absent: 0,
    halfDay: 0,
    late: 0,
    onLeave: dummyAttendance.filter(a => a.status === 'ON_LEAVE').length,
    trend: [
      { date: 'Mon', present: 3, absent: 1 },
      { date: 'Tue', present: 4, absent: 0 },
      { date: 'Wed', present: 3, absent: 1 },
      { date: 'Thu', present: 4, absent: 0 },
      { date: 'Fri', present: 4, absent: 0 }
    ]
  });

  mock.onGet(/\/analytics\/tasks/).reply(200, {
    total: dummyTasks.length,
    completed: dummyTasks.filter(t => t.status === 'COMPLETED').length,
    inProgress: dummyTasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: 0,
    topPerformers: [
      { id: 'emp2', name: 'Jane Smith', completed: 15 },
      { id: 'emp1', name: 'John Doe', completed: 10 }
    ]
  });

  mock.onGet(/\/analytics\/projects/).reply(200, {
    total: dummyProjects.length,
    active: dummyProjects.filter(p => p.status === 'IN_PROGRESS').length,
    completed: dummyProjects.filter(p => p.status === 'COMPLETED').length,
    nearingDeadline: [
      { id: 'proj1', name: 'Website Redesign', deadline: '2026-09-30' }
    ]
  });

  mock.onGet(/\/analytics\/team-productivity/).reply(200, dummyEmployees.map(e => ({
    id: e.id,
    name: e.firstName + ' ' + e.lastName,
    totalTasks: Math.floor(Math.random() * 20) + 5,
    completed: Math.floor(Math.random() * 15) + 2,
    completionRate: Math.floor(Math.random() * 40) + 60,
    overdue: Math.floor(Math.random() * 2),
    score: Math.floor(Math.random() * 30) + 70
  })));

  // Auth
  mock.onPost(/\/auth\/login/).reply(200, {
    success: true,
    token: 'dummy-token',
    employee: dummyEmployees[0]
  });

  mock.onPost(/\/auth\/logout/).reply(200, { success: true });
  // Client & Milestones
  mock.onPost(/\/auth\/client-login/).reply(200, {
    success: true,
    token: 'dummy-client-token',
    client: { id: 'client1', name: 'Acme Corp', clientId: 'CL-001' }
  });

  const dummyMilestones = [
    { id: 'ms1', projectId: 'proj1', title: 'Phase 1 Delivery', amount: 25000, paidAmount: 25000, dueDate: '2026-08-01', status: 'PAID', createdAt: new Date().toISOString(), project: dummyProjects[0] },
    { id: 'ms2', projectId: 'proj1', title: 'Phase 2 Delivery', amount: 25000, paidAmount: 0, dueDate: '2026-09-30', status: 'PENDING', createdAt: new Date().toISOString(), project: dummyProjects[0] },
    { id: 'ms3', projectId: 'proj2', title: 'App Wireframes', amount: 10000, paidAmount: 0, dueDate: '2026-08-31', status: 'PENDING', createdAt: new Date().toISOString(), project: dummyProjects[1] }
  ];

  mock.onGet(/\/projects\/milestones\/all/).reply(200, {
    milestones: dummyMilestones,
    stats: {
      totalAmount: 60000,
      totalPaid: 25000,
      totalPending: 35000,
      overdueCount: 0,
      paidCount: 1,
      pendingCount: 2,
      partiallyPaidCount: 0
    }
  });

  mock.onGet(/\/client\/.*/).reply(200, { success: true, data: [] });

  // Generic Fallbacks to prevent UI crashes
  const arrayEndpoints = [
    /\/leads/, /\/expenses/, /\/meetings/, /\/performance/, /\/chat\/rooms/, 
    /\/notifications/, /\/time\/active/, /\/client\/projects/, /\/employees\/.+\/attendance/,
    /\/employees\/.+\/tasks/, /\/employees\/.+\/projects/, /\/employees\/.+\/reports/,
    /\/activity\/.*/
  ];
  arrayEndpoints.forEach(regex => {
    mock.onGet(regex).reply(200, []);
  });

  mock.onGet(/.*/).reply(200, { data: [], items: [], success: true, project: {}, employee: {}, tasks: [], milestones: [] });
  mock.onPost(/.*/).reply(200, { success: true, data: {} });
  mock.onPut(/.*/).reply(200, { success: true, data: {} });
  mock.onPatch(/.*/).reply(200, { success: true, data: {} });
  mock.onDelete(/.*/).reply(200, { success: true });

};

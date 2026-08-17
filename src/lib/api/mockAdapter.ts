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
    { id: 'task1', title: 'Design Mockups', description: 'Create Figma mockups', status: 'TODO', priority: 'HIGH', projectId: 'proj1', assigneeId: 'emp2', startDate: new Date(Date.now() - 2 * 86400000).toISOString(), deadline: new Date(Date.now() + 5 * 86400000).toISOString() },
    { id: 'task2', title: 'Setup DB', description: 'Initialize PostgreSQL', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'proj2', assigneeId: 'emp1', startDate: new Date(Date.now() - 5 * 86400000).toISOString(), deadline: new Date(Date.now() + 10 * 86400000).toISOString() },
    { id: 'task3', title: 'User Research', description: 'Interview stakeholders', status: 'COMPLETED', priority: 'LOW', projectId: 'proj1', assigneeId: 'emp3', startDate: new Date(Date.now() - 15 * 86400000).toISOString(), deadline: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'task4', title: 'API Integration', description: 'Integrate the new APIs', status: 'TODO', priority: 'HIGH', projectId: 'proj1', assigneeId: 'emp1', startDate: new Date(Date.now() + 1 * 86400000).toISOString(), deadline: new Date(Date.now() + 15 * 86400000).toISOString() }
  ];

  const dummyLeaves = [
    { id: 'leave1', employeeId: 'emp1', employee: dummyEmployees[1], leaveType: 'SICK_LEAVE', startDate: '2026-08-10', endDate: '2026-08-12', numberOfDays: 3, reason: 'Viral Fever', status: 'APPROVED', createdAt: '2026-08-08T10:00:00Z' },
    { id: 'leave2', employeeId: 'emp3', employee: dummyEmployees[3], leaveType: 'CASUAL_LEAVE', startDate: '2026-08-18', endDate: '2026-08-20', numberOfDays: 3, reason: 'Family Function', status: 'PENDING', createdAt: '2026-08-15T10:00:00Z' },
    { id: 'leave3', employeeId: 'emp2', employee: dummyEmployees[2], leaveType: 'EARNED_LEAVE', startDate: '2026-07-01', endDate: '2026-07-05', numberOfDays: 5, reason: 'Vacation', status: 'REJECTED', createdAt: '2026-06-25T10:00:00Z' }
  ];

  const dummyTimesheets = [
    {
      id: 'ts1', employeeId: 'emp1', employee: dummyEmployees[1], projectId: 'proj1', project: dummyProjects[0], task: dummyTasks[0],
      date: new Date().toISOString(), startTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(), endTime: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
      durationMinutes: 210, description: 'Worked on UI mockups for the new dashboard', type: 'MANUAL', status: 'APPROVED', isBillable: true, workCategory: 'DESIGN'
    },
    {
      id: 'ts2', employeeId: 'emp2', employee: dummyEmployees[2], projectId: 'proj2', project: dummyProjects[1], task: dummyTasks[1],
      date: new Date().toISOString(), startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), endTime: new Date(new Date().setHours(16, 45, 0, 0)).toISOString(),
      durationMinutes: 165, description: 'Database schema design and initialization', type: 'TIMER', status: 'SUBMITTED', isBillable: true, workCategory: 'DEVELOPMENT'
    },
    {
      id: 'ts3', employeeId: 'emp1', employee: dummyEmployees[1], manualProjectName: 'Internal Meeting',
      date: new Date(Date.now() - 86400000).toISOString(), startTime: new Date(new Date(Date.now() - 86400000).setHours(10, 0, 0, 0)).toISOString(), endTime: new Date(new Date(Date.now() - 86400000).setHours(11, 0, 0, 0)).toISOString(),
      durationMinutes: 60, description: 'Weekly sync with the team', type: 'MANUAL', status: 'APPROVED', isBillable: false, workCategory: 'MEETING'
    },
    {
      id: 'ts4', employeeId: 'emp3', employee: dummyEmployees[3], projectId: 'proj1', project: dummyProjects[0], task: dummyTasks[2],
      date: new Date(Date.now() - 86400000).toISOString(), startTime: new Date(new Date(Date.now() - 86400000).setHours(13, 0, 0, 0)).toISOString(), endTime: new Date(new Date(Date.now() - 86400000).setHours(17, 0, 0, 0)).toISOString(),
      durationMinutes: 240, description: 'User interviews and research summary', type: 'TIMER', status: 'APPROVED', isBillable: true, workCategory: 'RESEARCH'
    }
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

  mock.onGet(/\/attendance\/analytics\/early-exit/).reply(200, {
    success: true,
    data: [
      {
        employeeId: dummyEmployees[1].employeeId,
        name: dummyEmployees[1].name,
        count: 2,
        reasons: [
          { date: new Date().toISOString(), reason: 'Doctor appointment' },
          { date: new Date(Date.now() - 86400000).toISOString(), reason: 'Family emergency' }
        ]
      },
      {
        employeeId: dummyEmployees[2].employeeId,
        name: dummyEmployees[2].name,
        count: 1,
        reasons: [
          { date: new Date(Date.now() - 172800000).toISOString(), reason: 'Felt sick' }
        ]
      }
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

  // Employees
  mock.onGet(/\/employees\/.+/).reply((config) => {
    const id = config.url?.split('/').pop();
    const emp = dummyEmployees.find(e => e.id === id);
    return [200, { data: emp, success: true }];
  });
  mock.onGet(/\/employees(\?.*)?$/).reply(200, { data: dummyEmployees, success: true });
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
  mock.onGet(/\/projects(\?.*)?$/).reply(200, dummyProjects);
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
  mock.onGet(/\/tasks(\?.*)?$/).reply(200, dummyTasks);

  // Leaves
  mock.onGet(/\/leaves\/my/).reply(200, dummyLeaves.filter(l => l.employeeId === 'emp1'));
  mock.onGet(/\/leaves(\?.*)?$/).reply(200, dummyLeaves);
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
  mock.onGet(/\/attendance(\?.*)?$/).reply(200, dummyAttendance);

  // Timesheets
  mock.onGet(/\/timesheets\/admin\/entries/).reply(200, dummyTimesheets);
  mock.onGet(/\/timesheets\/my/).reply(200, dummyTimesheets.filter(t => t.employeeId === 'emp1'));
  mock.onGet(/\/timesheets\/active-timer/).reply(200, null);
  mock.onGet(/\/timesheets\/admin\/overview/).reply(200, {
    pendingApprovals: dummyTimesheets.filter(t => t.status === 'SUBMITTED').length,
    totalHours: Math.round(dummyTimesheets.reduce((a, b) => a + (b.durationMinutes || 0), 0) / 60),
    billableHours: Math.round(dummyTimesheets.filter(t => t.isBillable).reduce((a, b) => a + (b.durationMinutes || 0), 0) / 60),
    totalEntries: dummyTimesheets.length
  });

  // Finance
  const dummyFinanceOverview = {
    totalRevenue: 2500000,
    totalPayroll: 850000,
    paidSalary: 600000,
    pendingSalary: 250000,
    totalExpenses: 120000,
    pettyCashExpense: 15000,
    totalDeductions: 45000,
    netPayable: 75000,
    recentTransactions: [
      { title: 'Server Hosting (AWS)', date: new Date().toISOString(), amount: 45000, type: 'EXPENSE', status: 'COMPLETED' },
      { title: 'Employee Salaries', date: new Date(Date.now() - 86400000 * 2).toISOString(), amount: 600000, type: 'PAYROLL', status: 'COMPLETED' },
      { title: 'Client Payment (Acme Corp)', date: new Date(Date.now() - 86400000 * 4).toISOString(), amount: 1200000, type: 'REVENUE', status: 'COMPLETED' },
      { title: 'Office Supplies', date: new Date(Date.now() - 86400000 * 5).toISOString(), amount: 15000, type: 'PETTY_CASH_OUT', status: 'COMPLETED' }
    ]
  };

  mock.onGet(/\/admin\/finance\/overview/).reply(200, { data: dummyFinanceOverview });
  mock.onGet(/\/admin\/finance\/payroll/).reply(200, { data: [] });
  mock.onGet(/\/admin\/finance\/deductions/).reply(200, { data: [] });
  mock.onGet(/\/admin\/finance\/addons/).reply(200, { data: [] });
  mock.onGet(/\/admin\/finance\/expenses/).reply(200, { data: [] });
  mock.onGet(/\/admin\/finance\/petty-cash/).reply(200, { data: [] });
  mock.onPost(/\/admin\/finance\/verify-pin/).reply(200, { success: true });

  // Activity & Devices
  const dummyDevices = [
    { id: 'd1', deviceId: 'WIN-DESKTOP-001', deviceName: 'John\'s Desktop', os: 'Windows 11', appVersion: '1.2.0', lastSeenAt: new Date().toISOString(), isRevoked: false, user: dummyEmployees[0] },
    { id: 'd2', deviceId: 'MAC-LAPTOP-002', deviceName: 'Sarah\'s MacBook', os: 'macOS Sonoma', appVersion: '1.2.0', lastSeenAt: new Date(Date.now() - 3600000).toISOString(), isRevoked: false, user: dummyEmployees[1] },
    { id: 'd3', deviceId: 'WIN-LAPTOP-003', deviceName: 'Old Laptop', os: 'Windows 10', appVersion: '1.1.0', lastSeenAt: new Date(Date.now() - 86400000 * 5).toISOString(), isRevoked: true, user: dummyEmployees[2] }
  ];
  mock.onGet(/\/activity\/devices/).reply(200, dummyDevices);
  mock.onPost(/\/activity\/devices\/.+\/revoke/).reply((config) => {
    const id = config.url?.split('/')[3];
    const device = dummyDevices.find(d => d.id === id);
    if (device) device.isRevoked = true;
    return [200, { success: true }];
  });

  const dummyIdleRequests = [
    { id: 'req1', userId: 'emp1', user: dummyEmployees[1], idleStartedAt: new Date(Date.now() - 7200000).toISOString(), reason: 'Power cut at my place.', status: 'PENDING_APPROVAL' },
    { id: 'req2', userId: 'emp2', user: dummyEmployees[2], idleStartedAt: new Date(Date.now() - 86400000).toISOString(), reason: 'Had to step away for a quick meeting.', status: 'APPROVED' },
    { id: 'req3', userId: 'emp3', user: dummyEmployees[3], idleStartedAt: new Date(Date.now() - 172800000).toISOString(), reason: 'Went for a 2 hour lunch.', status: 'REJECTED' }
  ];
  mock.onGet(/\/activity\/resume-requests/).reply(200, dummyIdleRequests);
  mock.onPut(/\/activity\/resume-requests\/.+\/approve/).reply((config) => {
    const id = config.url?.split('/')[3];
    const req = dummyIdleRequests.find(r => r.id === id);
    if (req) req.status = 'APPROVED';
    return [200, { success: true }];
  });
  mock.onPut(/\/activity\/resume-requests\/.+\/reject/).reply((config) => {
    const id = config.url?.split('/')[3];
    const req = dummyIdleRequests.find(r => r.id === id);
    if (req) req.status = 'REJECTED';
    return [200, { success: true }];
  });

  // Pilot Analytics
  mock.onGet(/\/pilot\/stats/).reply(200, {
    activePilotUsers: 45,
    feedbackCount: 12,
    recentCrashes: [
      { id: 'c1', errorMessage: 'Memory out of bounds', user: dummyEmployees[1], deviceId: 'MAC-LAPTOP-002', errorStack: 'Error: Memory out of bounds\\n    at DesktopAgent.sync (agent.js:45)\\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'c2', errorMessage: 'Failed to reconnect socket', user: dummyEmployees[0], deviceId: 'WIN-DESKTOP-001', errorStack: 'SocketException: Connection refused\\n    at NetworkHandler.connect (network.js:12)', timestamp: new Date(Date.now() - 86400000).toISOString() }
    ],
    recentFeedback: [
      { id: 'f1', user: dummyEmployees[2], rating: 5, isIdleAccurate: true, hadFalsePause: false, comment: 'The new idle detection works perfectly, doesn\'t pause when I\'m reading long documents.', createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'f2', user: dummyEmployees[1], rating: 3, isIdleAccurate: false, hadFalsePause: true, comment: 'It paused my timer while I was on a Zoom call on my other monitor.', createdAt: new Date(Date.now() - 86400000).toISOString() }
    ]
  });

  // Analytics
  mock.onGet(/\/analytics\/team-productivity/).reply(200, [
    { id: 't1', name: 'Frontend', totalTasks: 45, completed: 38, completionRate: 84, overdue: 2, score: 92 },
    { id: 't2', name: 'Backend', totalTasks: 50, completed: 42, completionRate: 84, overdue: 3, score: 88 },
    { id: 't3', name: 'Design', totalTasks: 20, completed: 18, completionRate: 90, overdue: 0, score: 95 }
  ]);
  mock.onGet(/\/analytics\/project-health/).reply(200, {
    onTime: 12,
    late: 2,
    pending: 5
  });
  mock.onGet(/\/analytics\/projects/).reply(200, {
    total: 19,
    active: 14,
    completed: 5,
    nearingDeadline: [
      { id: 'p1', name: 'CRM Revamp', deadline: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'ACTIVE', manager: { name: 'John Doe' } }
    ]
  });
  mock.onGet(/\/analytics\/efficiency/).reply(200, [
    { name: 'Alice Smith', attendanceHours: 160, trackedHours: 145, missingHours: 15, efficiency: 90 },
    { name: 'Bob Jones', attendanceHours: 150, trackedHours: 148, missingHours: 2, efficiency: 98 },
    { name: 'Charlie Brown', attendanceHours: 160, trackedHours: 120, missingHours: 40, efficiency: 75 }
  ]);
  mock.onGet(/\/analytics\/employees/).reply(200, {
    total: 24,
    active: 22,
    byDepartment: [{ name: 'Engineering', count: 12 }, { name: 'Design', count: 4 }]
  });
  mock.onGet(/\/analytics\/attendance/).reply(200, {
    present: 20, absent: 2, halfDay: 0, late: 2, onLeave: 0, trend: []
  });
  mock.onGet(/\/analytics\/tasks/).reply(200, {
    total: 150, completed: 90, inProgress: 40, overdue: 20, topPerformers: []
  });
  mock.onGet(/\/analytics\/productivity/).reply(200, {
    sodsSubmitted: 22, eodsSubmitted: 18, pendingEods: []
  });

  // Chat
  const dummyChatRooms = [
    {
      id: 'room1',
      name: 'Engineering Team',
      type: 'GROUP',
      isArchived: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        { id: 'm1', roomId: 'room1', employeeId: 'emp1', employee: dummyEmployees[1], isAdmin: true, isPinned: false, isFavorite: false, isMuted: false, priority: 'MEDIUM' },
        { id: 'm2', roomId: 'room1', employeeId: 'emp2', employee: dummyEmployees[2], isAdmin: false, isPinned: false, isFavorite: false, isMuted: false, priority: 'MEDIUM' }
      ],
      messages: [
        { id: 'msg1', roomId: 'room1', senderId: 'emp2', content: 'Hey team, the new API is deployed.', createdAt: new Date(Date.now() - 86400000).toISOString(), sender: dummyEmployees[2] },
        { id: 'msg2', roomId: 'room1', senderId: 'emp1', content: 'Great work! I will start testing it now.', createdAt: new Date(Date.now() - 4000000).toISOString(), sender: dummyEmployees[1] }
      ]
    },
    {
      id: 'room2',
      name: null,
      type: 'PERSONAL',
      isArchived: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        { id: 'm3', roomId: 'room2', employeeId: 'emp1', employee: dummyEmployees[1], isAdmin: false, isPinned: true, isFavorite: true, isMuted: false, priority: 'HIGH' },
        { id: 'm4', roomId: 'room2', employeeId: 'emp3', employee: dummyEmployees[3], isAdmin: false, isPinned: false, isFavorite: false, isMuted: false, priority: 'MEDIUM' }
      ],
      messages: [
        { id: 'msg3', roomId: 'room2', senderId: 'emp3', content: 'Do you have the latest design files?', createdAt: new Date(Date.now() - 3600000).toISOString(), sender: dummyEmployees[3] },
        { id: 'msg4', roomId: 'room2', senderId: 'emp1', content: 'Yes, I will send them over in a bit.', createdAt: new Date(Date.now() - 100000).toISOString(), sender: dummyEmployees[1] }
      ]
    }
  ];

  mock.onGet(/\/chat\/rooms$/).reply(200, dummyChatRooms);
  mock.onGet(/\/chat\/rooms\/.+\/messages/).reply((config) => {
    const roomId = config.url?.split('/')[3];
    const room = dummyChatRooms.find(r => r.id === roomId);
    return [200, room ? room.messages : []];
  });
  mock.onPost(/\/chat\/messages/).reply((config) => {
    const data = JSON.parse(config.data);
    const newMessage = {
      id: `msg${Date.now()}`,
      roomId: data.roomId,
      senderId: dummyEmployees[1].id,
      content: data.content,
      createdAt: new Date().toISOString(),
      sender: dummyEmployees[1]
    };
    const room = dummyChatRooms.find(r => r.id === data.roomId);
    if (room) {
      room.messages.push(newMessage);
      room.updatedAt = newMessage.createdAt;
    }
    return [200, { newMessage }];
  });

  // Settings
  mock.onGet(/\/settings\/notifications/).reply(200, {
    id: 'n1', userId: 'emp1', enabledTypes: ['TASK_ASSIGNED', 'SOD_REMINDER'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  mock.onPut(/\/settings\/notifications/).reply(200, {
    id: 'n1', userId: 'emp1', enabledTypes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  mock.onGet(/\/settings$/).reply(200, {
    id: 'sys1', officeStartTime: '09:00', lateThreshold: '09:15', lateComingEnabled: true, halfDayEnabled: true,
    lunchDuration: 60, breakDuration: 15, sodReminderTime: '08:45', eodReminderTime: '18:00',
    idleTimeoutMinutes: 15, idleWarningSeconds: 60, autoPauseTimerEnabled: true, requireApprovalToResume: false,
    desktopAppEnabledRoles: ['EMPLOYEE'], heartbeatIntervalSeconds: 60, autoStartEnabled: true, ruleBookText: null
  });
  mock.onPatch(/\/settings$/).reply(200, {});
  mock.onGet(/\/employees\/.+/).reply((config) => {
    const id = config.url?.split('/')[2];
    const emp = dummyEmployees.find(e => e.id === id);
    return [200, { data: emp || dummyEmployees[0] }];
  });
  mock.onPut(/\/auth\/me/).reply(200, { success: true, message: 'Updated', data: dummyEmployees[1] });
  mock.onPost(/\/auth\/change-password/).reply(200, { success: true, message: 'Password changed' });

  // Portfolio
  const dummyPortfolio = [
    {
      id: 'port1',
      title: 'E-Commerce Revamp',
      description: 'Complete overhaul of the e-commerce platform using Next.js and Tailwind CSS.',
      projectLink: 'https://ecommerce-revamp.demo.com',
      technologiesUsed: 'React, Next.js, Tailwind, Stripe',
      completionDate: new Date(Date.now() - 86400000 * 30).toISOString(),
      createdById: dummyEmployees[1].id,
      createdBy: dummyEmployees[1],
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 30).toISOString()
    },
    {
      id: 'port2',
      title: 'Banking Mobile App',
      description: 'A React Native mobile application for digital banking with high security features.',
      projectLink: 'https://banking-app.demo.com',
      technologiesUsed: 'React Native, Node.js, PostgreSQL',
      completionDate: new Date(Date.now() - 86400000 * 90).toISOString(),
      createdById: dummyEmployees[2].id,
      createdBy: dummyEmployees[2],
      createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 90).toISOString()
    },
    {
      id: 'port3',
      title: 'Internal CRM Tool',
      description: 'CRM tool built for internal sales team to manage leads and client communications.',
      projectLink: '',
      technologiesUsed: 'Vue.js, Express, MongoDB',
      completionDate: new Date(Date.now() - 86400000 * 15).toISOString(),
      createdById: dummyEmployees[3].id,
      createdBy: dummyEmployees[3],
      createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 15).toISOString()
    }
  ];

  mock.onGet(/\/portfolio$/).reply(200, dummyPortfolio);
  mock.onGet(/\/portfolio\/.+/).reply((config) => {
    const id = config.url?.split('/')[2];
    const project = dummyPortfolio.find(p => p.id === id);
    return [200, project || dummyPortfolio[0]];
  });
  mock.onPost(/\/portfolio$/).reply((config) => {
    const data = JSON.parse(config.data);
    const newProject = {
      id: `port${Date.now()}`,
      ...data,
      createdById: dummyEmployees[1].id,
      createdBy: dummyEmployees[1],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dummyPortfolio.unshift(newProject);
    return [200, newProject];
  });
  mock.onPut(/\/portfolio\/.+/).reply((config) => {
    const id = config.url?.split('/')[2];
    const data = JSON.parse(config.data);
    const projectIndex = dummyPortfolio.findIndex(p => p.id === id);
    if (projectIndex !== -1) {
      dummyPortfolio[projectIndex] = { ...dummyPortfolio[projectIndex], ...data, updatedAt: new Date().toISOString() };
      return [200, dummyPortfolio[projectIndex]];
    }
    return [404, { message: 'Not found' }];
  });
  mock.onDelete(/\/portfolio\/.+/).reply((config) => {
    const id = config.url?.split('/')[2];
    const projectIndex = dummyPortfolio.findIndex(p => p.id === id);
    if (projectIndex !== -1) {
      dummyPortfolio.splice(projectIndex, 1);
    }
    return [200, { success: true }];
  });

  // Reports
  const dummyReports = [
    {
      id: 'rep1', employeeId: 'emp1', date: new Date().toISOString().split('T')[0],
      sodText: 'I will be working on the new analytics dashboard.',
      eodText: 'Finished the UI, API integration is pending.',
      tasksCompleted: 'UI for Pilot Analytics', blockers: 'None',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      employee: dummyEmployees[1]
    },
    {
      id: 'rep2', employeeId: 'emp2', date: new Date().toISOString().split('T')[0],
      sodText: 'Backend API optimizations for finance module.',
      eodText: null, tasksCompleted: null, blockers: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      employee: dummyEmployees[2]
    },
    {
      id: 'rep3', employeeId: 'emp3', date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      sodText: 'Design review for the mobile app.',
      eodText: 'All screens approved.', tasksCompleted: 'Mobile App screens', blockers: 'None',
      createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(),
      employee: dummyEmployees[3]
    }
  ];

  mock.onGet(/\/reports\/team/).reply(200, dummyReports);
  mock.onGet(/\/reports\/my/).reply(200, dummyReports.filter(r => r.employeeId === 'emp1'));
  mock.onGet(/\/reports\/date\/.+/).reply((config) => {
    const date = config.url?.split('/')[3];
    return [200, dummyReports.filter(r => r.date === date)];
  });
  
  mock.onPost(/\/reports\/sod/).reply((config) => {
    const data = JSON.parse(config.data);
    const newReport = {
      id: `rep${Date.now()}`, employeeId: 'emp1', date: new Date().toISOString().split('T')[0],
      sodText: data.sodText, eodText: null, tasksCompleted: null, blockers: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      employee: dummyEmployees[1]
    };
    dummyReports.unshift(newReport);
    return [200, { report: newReport }];
  });

  mock.onPatch(/\/reports\/eod\/.+/).reply((config) => {
    const id = config.url?.split('/')[3];
    const data = JSON.parse(config.data);
    const report = dummyReports.find(r => r.id === id);
    if (report) {
      report.eodText = data.eodText;
      report.tasksCompleted = data.tasksCompleted;
      report.blockers = data.blockers;
      report.updatedAt = new Date().toISOString();
    }
    return [200, { report }];
  });

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

  // Client Portal Data
  const dummyClientProjects = [
    {
      id: 'proj1', projectId: 'PRJ-2026-001', name: 'E-Commerce Platform',
      description: 'Building a fully responsive B2B platform.',
      status: 'ACTIVE', startDate: '2026-06-01', deadline: '2026-12-31', progress: 45,
      taskCounts: { total: 10, completed: 4, inProgress: 3, testing: 1, todo: 2 },
      tasks: [
        { id: 't1', title: 'Design System', status: 'COMPLETED', priority: 'HIGH' },
        { id: 't2', title: 'Payment Gateway Integration', status: 'IN_PROGRESS', priority: 'URGENT' },
        { id: 't3', title: 'User Authentication', status: 'TESTING', priority: 'HIGH' }
      ],
      milestones: [
        { id: 'm1', title: 'Phase 1 MVP', status: 'PAID', amount: 5000, paidAmount: 5000 },
        { id: 'm2', title: 'Phase 2 Beta', status: 'PENDING', amount: 10000, paidAmount: 0 }
      ],
      team: [
        { id: 'emp1', name: 'John Doe', role: 'Project Manager' },
        { id: 'emp2', name: 'Sarah Smith', role: 'Lead Developer' }
      ]
    }
  ];

  const dummyClientInvoices = [
    {
      id: 'inv1', clientName: 'Acme Corp', projectId: 'PRJ-2026-001', amount: 5000,
      status: 'PAID', dueDate: '2026-07-01', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      items: [{ id: 'item1', description: 'Phase 1 Development', total: 5000 }],
      project: { id: 'proj1', name: 'E-Commerce Platform', projectId: 'PRJ-2026-001' }
    },
    {
      id: 'inv2', clientName: 'Acme Corp', projectId: 'PRJ-2026-001', amount: 10000,
      status: 'SENT', dueDate: '2026-09-01', createdAt: new Date().toISOString(),
      items: [{ id: 'item2', description: 'Phase 2 Development Advance', total: 10000 }],
      project: { id: 'proj1', name: 'E-Commerce Platform', projectId: 'PRJ-2026-001' }
    }
  ];

  const dummyClientTickets = [
    {
      id: 'tkt1', ticketNo: 'TKT-1001', subject: 'Server Down Issue',
      description: 'The staging server is throwing a 502 Bad Gateway.',
      category: 'TECHNICAL', priority: 'HIGH', status: 'RESOLVED',
      project: { id: 'proj1', name: 'E-Commerce Platform' },
      replies: [{ id: 'rep1', ticketId: 'tkt1', senderType: 'ADMIN', senderId: 'admin1', senderName: 'Support Team', message: 'Resolved the proxy configuration issue.', createdAt: new Date().toISOString() }],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date().toISOString()
    }
  ];

  mock.onGet(/\/client\/projects\/.+/).reply((config) => {
    const id = config.url?.split('/')[3];
    return [200, { data: dummyClientProjects.find(p => p.id === id || p.projectId === id) || dummyClientProjects[0] }];
  });
  mock.onGet(/\/client\/projects/).reply(200, { data: dummyClientProjects });
  
  mock.onGet(/\/client\/invoices\/.+/).reply((config) => {
    const id = config.url?.split('/')[3];
    return [200, { data: dummyClientInvoices.find(i => i.id === id) || dummyClientInvoices[0] }];
  });
  mock.onGet(/\/client\/invoices/).reply(200, { data: dummyClientInvoices });
  
  mock.onGet(/\/client\/tickets\/.+/).reply((config) => {
    const id = config.url?.split('/')[3];
    return [200, { data: dummyClientTickets.find(t => t.id === id) || dummyClientTickets[0] }];
  });
  mock.onGet(/\/client\/tickets/).reply(200, { data: dummyClientTickets });
  
  mock.onGet(/\/client\/me/).reply(200, { data: { id: 'client1', name: 'Acme Corp', clientId: 'CL-001', email: 'contact@acmecorp.com' } });
  
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

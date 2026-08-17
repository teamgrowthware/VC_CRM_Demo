import MockAdapter from 'axios-mock-adapter';
import { AxiosInstance } from 'axios';

export const setupMockAdapter = (apiClient: AxiosInstance) => {
  const mock = new MockAdapter(apiClient, { delayResponse: 500 });

let dummyEmployees = [
  { id: 'admin1', firstName: 'Admin', lastName: 'User', role: 'ADMIN', email: 'admin@demo.com', status: 'ACTIVE', department: 'Management', joiningDate: new Date().toISOString() },
  { id: 'emp1', firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE', email: 'john@demo.com', status: 'ACTIVE', department: 'Engineering', joiningDate: new Date().toISOString() },
  { id: 'emp2', firstName: 'Jane', lastName: 'Smith', role: 'MANAGER', email: 'jane@demo.com', status: 'ACTIVE', department: 'Design', joiningDate: new Date().toISOString() }
];

let dummyProjects = [
  { id: 'proj1', name: 'Website Redesign', description: 'Redesign the corporate website', status: 'IN_PROGRESS', startDate: new Date().toISOString(), deadline: new Date().toISOString(), budget: 50000, members: [] },
  { id: 'proj2', name: 'Mobile App', description: 'Develop a new iOS app', status: 'NOT_STARTED', startDate: new Date().toISOString(), deadline: new Date().toISOString(), budget: 100000, members: [] },
];

let dummyTasks = [
  { id: 'task1', title: 'Design Mockups', description: 'Create Figma mockups', status: 'TODO', priority: 'HIGH', projectId: 'proj1', assigneeId: 'emp2' },
  { id: 'task2', title: 'Setup DB', description: 'Initialize PostgreSQL', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'proj2', assigneeId: 'emp1' },
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

// Attendance
mock.onGet(/\/attendance\/all/).reply(200, { data: [], success: true });

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
    recentActivities: [],
    upcomingDeadlines: []
  }
});

mock.onGet(/\/analytics\/employees/).reply(200, {
  total: dummyEmployees.length,
  active: dummyEmployees.filter(e => e.status === 'ACTIVE').length,
  byDepartment: [{ name: 'Engineering', count: 1 }, { name: 'Management', count: 1 }, { name: 'Design', count: 1 }]
});

mock.onGet(/\/analytics\/attendance/).reply(200, {
  present: dummyEmployees.length,
  absent: 0,
  halfDay: 0,
  late: 0,
  onLeave: 0,
  trend: []
});

mock.onGet(/\/analytics\/tasks/).reply(200, {
  total: dummyTasks.length,
  completed: dummyTasks.filter(t => t.status === 'COMPLETED').length,
  inProgress: dummyTasks.filter(t => t.status === 'IN_PROGRESS').length,
  overdue: 0,
  topPerformers: []
});

mock.onGet(/\/analytics\/projects/).reply(200, {
  total: dummyProjects.length,
  active: dummyProjects.filter(p => p.status === 'IN_PROGRESS').length,
  completed: dummyProjects.filter(p => p.status === 'COMPLETED').length,
  nearingDeadline: []
});

mock.onGet(/\/analytics\/team-productivity/).reply(200, dummyEmployees.map(e => ({
  id: e.id,
  name: e.firstName + ' ' + e.lastName,
  totalTasks: 5,
  completed: 4,
  completionRate: 80,
  overdue: 0,
  score: 95
})));

// Auth
mock.onPost(/\/auth\/login/).reply(200, {
  success: true,
  token: 'dummy-token',
  employee: dummyEmployees[0]
});

mock.onPost(/\/auth\/logout/).reply(200, { success: true });

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

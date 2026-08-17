import { Layout, Users, Calendar, MessageCircle, BarChart3, ClipboardList, Folders, Clock, Settings as SettingsIcon, IndianRupee, ExternalLink, Lock, Monitor, BookOpen, FileText } from 'lucide-react';

export const getNavItemsForRole = (user?: any, portfolioProjects: any[] = []) => {
  const role = user?.role;
  const userId = user?.id || '';

  const portfolioSubItems = portfolioProjects.slice(0, 5).map(p => ({
    href: `/dashboard/project-portfolio/${p.id}`,
    label: p.title,
    icon: ExternalLink
  }));

  const commonItems = [
    { href: '/dashboard/rulebook', label: 'Rulebook', icon: BookOpen },
  ];

  switch (role) {
    case 'ADMIN':
      return [
        { href: '/dashboard/admin', label: 'Dashboard', icon: Layout },
        { href: '/dashboard/employees', label: 'Employees', icon: Users },
        { href: '/dashboard/attendance', label: 'Attendance', icon: Clock },
        { href: '/dashboard/projects', label: 'Projects', icon: Folders },
        { href: '/dashboard/gantt', label: 'Gantt Timeline', icon: Calendar },
        { href: '/dashboard/tasks', label: 'Tasks', icon: Layout },
        { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
        { href: '/dashboard/finance', label: 'Finance', icon: IndianRupee },
        { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/dashboard/leaves', label: 'Leaves', icon: Calendar },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
        { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
        { href: '/dashboard/devices', label: 'Devices', icon: Monitor },
        { href: '/dashboard/idle-requests', label: 'Idle Requests', icon: Lock },
        { href: '/dashboard/pilot-analytics', label: 'Pilot Analytics', icon: BarChart3 },
        { href: '/dashboard/daily-reports', label: 'My Reports (SOD/EOD)', icon: ClipboardList },
        { href: '/dashboard/team-reports', label: 'Team Reports', icon: ClipboardList },
        { href: '/dashboard/project-portfolio', label: 'Portfolio', icon: Folders, subItems: portfolioSubItems },
        ...commonItems
      ];
    case 'HR':
      return [
        { href: '/dashboard/hr', label: 'Dashboard', icon: Layout },
        { href: '/dashboard/employees', label: 'Employees', icon: Users },
        { href: '/dashboard/attendance', label: 'Attendance', icon: Clock },
        { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
        { href: '/dashboard/finance', label: 'Finance', icon: IndianRupee },
        { href: '/dashboard/leaves', label: 'Leaves', icon: Calendar },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
        { href: '/dashboard/idle-requests', label: 'Idle Requests', icon: Lock },
        { href: '/dashboard/pilot-analytics', label: 'Pilot Analytics', icon: BarChart3 },
        { href: '/dashboard/daily-reports', label: 'My Reports (SOD/EOD)', icon: ClipboardList },
        { href: '/dashboard/team-reports', label: 'Team Reports', icon: ClipboardList },
        { href: '/dashboard/project-portfolio', label: 'Portfolio', icon: Folders, subItems: portfolioSubItems },
        ...commonItems
      ];
    case 'MANAGER':
      return [
        { href: '/dashboard/manager', label: 'Dashboard', icon: Layout },
        { href: '/dashboard/employees', label: 'Employees', icon: Users },
        { href: '/dashboard/attendance', label: 'Attendance', icon: Clock },
        { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
        { href: '/dashboard/finance', label: 'Finance', icon: IndianRupee },
        { href: '/dashboard/leaves', label: 'Leaves', icon: Calendar },
        { href: '/dashboard/projects', label: 'My Projects', icon: Folders },
        { href: '/dashboard/tasks', label: 'Team Tasks', icon: Layout },
        { href: '/dashboard/kanban', label: 'Kanban Board', icon: Layout },
        { href: '/dashboard/gantt', label: 'Gantt Timeline', icon: Calendar },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
        { href: '/dashboard/idle-requests', label: 'Idle Requests', icon: Lock },
        { href: '/dashboard/pilot-analytics', label: 'Pilot Analytics', icon: BarChart3 },
        { href: '/dashboard/daily-reports', label: 'My Reports (SOD/EOD)', icon: ClipboardList },
        { href: '/dashboard/team-reports', label: 'Team Reports', icon: ClipboardList },
        { href: '/dashboard/project-portfolio', label: 'Portfolio', icon: Folders, subItems: portfolioSubItems },
        ...commonItems
      ];
    case 'PROJECT_MANAGER':
      return [
        { href: '/dashboard/manager', label: 'PM Dashboard', icon: Layout },
        { href: '/dashboard/projects', label: 'My Projects', icon: Folders },
        { href: '/dashboard/gantt', label: 'Gantt Timeline', icon: Calendar },
        { href: '/dashboard/tasks', label: 'Project Tasks', icon: Layout },
        { href: '/dashboard/attendance', label: 'My Attendance', icon: Clock },
        { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
        { href: '/dashboard/payslips', label: 'My Payslips', icon: FileText },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
        { href: '/dashboard/project-portfolio', label: 'Project Portfolio', icon: Folders, subItems: portfolioSubItems },
        { href: `/dashboard/employees/${userId}`, label: 'My Profile', icon: Users },
        ...commonItems
      ];
    case 'EMPLOYEE':
    default:
      return [
        { href: '/dashboard/employee', label: 'Dashboard', icon: Layout },
        { href: '/dashboard/sprints', label: 'Sprint Board', icon: Folders },
        { href: '/dashboard/tasks/my-assigned', label: 'My Assigned Tasks', icon: Layout },
        { href: '/dashboard/tasks', label: 'Legacy Tasks', icon: Layout },
        { href: '/dashboard/gantt', label: 'Gantt Timeline', icon: Calendar },
        { href: '/dashboard/attendance', label: 'Attendance', icon: Clock },
        { href: '/dashboard/timesheet', label: 'Timesheet', icon: Clock },
        { href: '/dashboard/leaves', label: 'Leaves', icon: Calendar },
        { href: '/dashboard/payslips', label: 'My Payslips', icon: FileText },
        { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
        { href: '/dashboard/daily-reports', label: 'My Reports (SOD/EOD)', icon: ClipboardList },
        { href: `/dashboard/employees/${userId}`, label: 'My Profile', icon: Users },
        { href: '/dashboard/project-portfolio', label: 'Portfolio', icon: Folders, subItems: portfolioSubItems },
        ...commonItems
      ];
  }
};

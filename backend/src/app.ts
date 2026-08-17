import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import reportRoutes from './routes/report.routes';
import leaveRoutes from './routes/leave.routes';
import expenseRoutes from './routes/expense.routes';
import performanceRoutes from './routes/performance.routes';
import meetingRoutes from './routes/meeting.routes';
import chatRoutes from './routes/chat.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import timesheetRoutes from './routes/timesheet.routes';
import leadRoutes from './routes/lead.routes';
import payrollRoutes from './routes/payroll.routes';
import holidayRoutes from './routes/holiday.routes';
import revenueRoutes from './routes/revenue.routes';
import settingsRoutes from './routes/settings.routes';
import portfolioRoutes from './routes/portfolio.routes';
import financeRoutes from './routes/finance.routes';
import agentRoutes from './routes/agent.routes';
import pilotRoutes from './routes/pilot.routes';
import demoRoutes from './routes/demo.routes';
import sprintRoutes from './routes/sprint.routes';
import announcementRoutes from './routes/announcement.routes';
import eventRoutes from './routes/event.routes';
import payslipRoutes from './routes/payslip.routes';
import pushRoutes from './routes/push.routes';
const app = express();

// Diagnostic logging for all incoming requests
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log(`[DEBUG] ${req.method} ${req.originalUrl} - Auth: ${authHeader ? (authHeader.substring(0, 15) + '...') : 'MISSING'}`);
  next();
});

// Middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'https://crm.vortexcubes.com', 'https://vortex-frontend-pao8.onrender.com'];

// Ensure production domain and localhost are always included for compatibility
if (!allowedOrigins.includes('https://crm.vortexcubes.com')) {
  allowedOrigins.push('https://crm.vortexcubes.com');
}
if (!allowedOrigins.includes('http://localhost:3000')) {
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(ao => ao.replace(/\/$/, '') === normalizedOrigin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin ${origin} not allowed. Allowed:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin/finance', financeRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/pilot', pilotRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Vortex Cubes CRM API is running', version: '1.2' });
});

// Root route for DigitalOcean App Platform Default Health Check
app.get('/', (req, res) => {
  res.status(200).send('Vortex Cubes CRM API is running');
});

app.get('/api/auth/force-seed', async (req, res) => {
  try {
    const prisma = require('./lib/prisma').default;
    const bcrypt = require('bcryptjs');
    
    // Clean up any weird state involving admin email or VC001
    await prisma.employee.deleteMany({
      where: {
        OR: [
          { email: 'admin@vortexcubes.com' },
          { employeeId: 'VC001' }
        ]
      }
    });

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const updated = await prisma.employee.create({
      data: {
        employeeId: 'VC001',
        name: 'Vortex Admin',
        email: 'admin@vortexcubes.com',
        password: adminPassword,
        designation: 'System Administrator',
        role: 'ADMIN',
        joiningDate: new Date(),
      }
    });
    res.json({ success: true, message: "Admin reset successful. Login with Admin@123" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;

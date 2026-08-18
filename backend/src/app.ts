import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
import timeRoutes from './routes/time.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import { authenticateToken, authorizeRoles } from './middleware/auth.middleware';
import { authLimiter, registerLimiter } from './middleware/rateLimit.middleware';
import { csrfProtect } from './middleware/csrf.middleware';
import { ADMIN_EMAIL } from './lib/config';
const app = express();

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

app.use(helmet());
app.set('trust proxy', 1);
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('public/uploads'));

// Rate limiting for authentication endpoints (brute-force protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/client-login', authLimiter);
app.use('/api/auth/register', registerLimiter);

// CSRF protection for cookie-authenticated mutating requests
app.use('/api', csrfProtect);

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
app.use('/api/time', timeRoutes);
app.use('/api/clients', clientRoutes.management);
app.use('/api/client', clientRoutes.portal);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Vortex Cubes CRM API is running', version: '1.2' });
});

// Root route for DigitalOcean App Platform Default Health Check
app.get('/', (req, res) => {
  res.status(200).send('Vortex Cubes CRM API is running');
});

app.get('/api/auth/force-seed', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const prisma = require('./lib/prisma').default;
    const bcrypt = require('bcryptjs');
    
    // Clean up any weird state involving admin email or VC001
    await prisma.employee.deleteMany({
      where: {
        OR: [
          { email: ADMIN_EMAIL || '' },
          { employeeId: 'VC001' }
        ]
      }
    });

    let seedPassword = process.env.ADMIN_SEED_PASSWORD;
    let generated = false;
    if (!seedPassword) {
      seedPassword = require('crypto').randomBytes(12).toString('base64url');
      generated = true;
    }
    const adminPassword = await bcrypt.hash(seedPassword, 10);
    const updated = await prisma.employee.create({
      data: {
        employeeId: 'VC001',
        name: 'Vortex Admin',
        email: ADMIN_EMAIL || 'admin@vortexcubes.com',
        password: adminPassword,
        designation: 'System Administrator',
        role: 'ADMIN',
        joiningDate: new Date(),
      }
    });

    if (generated) {
      console.log('[force-seed] No ADMIN_SEED_PASSWORD set. Generated a random admin password (shown once).');
    }

    try {
      await prisma.activityLog.create({
        data: {
          type: 'ADMIN_RESET',
          message: `${(req as any).user?.name || 'Admin'} reset the admin account`,
          entityType: 'AUTH',
          entityId: updated.id,
          userId: (req as any).user?.id,
        }
      });
    } catch (auditErr) {
      console.error('[AUDIT] force-seed audit write failed:', auditErr);
    }

    res.json({ success: true, message: "Admin reset successful." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Multer / upload error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.name === 'MulterError' || err?.message?.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;

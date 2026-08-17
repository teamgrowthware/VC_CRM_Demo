import nodemailer from 'nodemailer';
import { SMTP_CONFIG } from '../lib/config';

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port,
  secure: SMTP_CONFIG.port === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});

export const sendWelcomeEmail = async (to: string, name: string) => {
  const mailOptions = {
    from: SMTP_CONFIG.from,
    to,
    subject: 'Welcome to Vortex Cubes CRM!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome, ${name}!</h2>
        <p>Your account has been successfully registered on <strong>Vortex Cubes CRM</strong>.</p>
        <p>You can now log in to manage your tasks, track attendance, and collaborate with your team.</p>
        <div style="margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;">If you have any issues, please contact your HR department.</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">&copy; 2026 Vortex Cubes CRM. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

export const sendTaskNotification = async (to: string, taskName: string, message: string) => {
  const mailOptions = {
    from: SMTP_CONFIG.from,
    to,
    subject: `New Task Assigned: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Task Notification</h2>
        <p>A new task has been assigned to you:</p>
        <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0;">${taskName}</h3>
          <p style="color: #6b7280;">${message}</p>
        </div>
        <p>Please log in to your dashboard to view more details.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">&copy; 2026 Vortex Cubes CRM. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Task notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending task notification email:', error);
    return false;
  }
};

export const sendGenericEmail = async (to: string, subject: string, message: string) => {
  const mailOptions = {
    from: SMTP_CONFIG.from,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">System Notification</h2>
        <p>${message}</p>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">&copy; 2026 Vortex Cubes CRM. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Generic email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending generic email:', error);
    return false;
  }
};

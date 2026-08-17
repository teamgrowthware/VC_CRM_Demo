import prisma from '../lib/prisma';
import { createNotification } from './notification.service';
import { NotificationType } from '@prisma/client';

export const checkDeadlines = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Find Tasks Due Soon (within 24 hours)
    // We only notify if they haven't been completed
    const dueSoonTasks = await (prisma as any).task.findMany({
      where: {
        dueDate: {
          gt: now,
          lte: tomorrow,
        },
        status: {
          not: 'COMPLETED',
        },
      },
      include: {
        assignedTo: true,
        project: {
          include: {
            manager: true
          }
        }
      },
    });

    for (const task of dueSoonTasks) {
      const message = `Task Due Soon: '${task.title}' is due in less than 24 hours.`;
      
      // Notify Assigned Employee
      if (task.assignedId) {
        await createNotification(
          task.assignedId,
          'DEADLINE_APPROACHING' as any,
          message,
          `/dashboard/tasks`
        );
      }

      // Notify Project Manager
      if (task.project?.managerId) {
        await createNotification(
          task.project.managerId,
          'DEADLINE_APPROACHING' as any,
          `Team Alert: '${task.title}' (Assigned to ${task.assignedTo?.name || 'Unassigned'}) is due soon.`,
          `/dashboard/tasks`
        );
      }
    }

    // 2. Find Overdue Tasks
    const overdueTasks = await (prisma as any).task.findMany({
      where: {
        deadline: {
          lt: now,
        },
        status: {
          not: 'COMPLETED',
        },
      },
      include: {
        assignedTo: true,
        project: {
          include: {
            manager: true
          }
        }
      },
    });

    for (const task of overdueTasks) {
      const message = `OVERDUE: Task '${task.title}' has passed its deadline!`;
      
      // Notify Assigned Employee
      if (task.assignedId) {
        await createNotification(
          task.assignedId,
          'TASK_OVERDUE' as any,
          message,
          `/dashboard/tasks`
        );
      }

      // Notify Project Manager
      if (task.project?.managerId) {
        await createNotification(
          task.project.managerId,
          'TASK_OVERDUE' as any,
          `Critical Alert: '${task.title}' is OVERDUE!`,
          `/dashboard/tasks`
        );
      }
    }
    
    // 3. Find Projects Ending Soon (within 3 days)
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const endingProjects = await prisma.project.findMany({
      where: {
        deadline: {
          gt: now,
          lte: threeDays,
        },
        status: {
          not: 'COMPLETED',
        }
      },
      include: {
        manager: true,
        members: { include: { employee: true } }
      }
    });

    for (const project of endingProjects) {
       const message = `Project Deadline: '${project.name}' is ending in less than 3 days (${project.deadline.toLocaleDateString()}).`;
       
       // Notify Manager
       await createNotification(
         project.managerId,
         'PROJECT_UPDATED' as any,
         message,
         `/dashboard/projects`
       );

       // Notify all members
       for (const member of project.members) {
          await createNotification(
            member.employeeId,
            'PROJECT_UPDATED' as any,
            message,
            `/dashboard/projects`
          );
       }
    }

    console.log(`[DeadlineService] Checked tasks and ${endingProjects.length} ending projects.`);
  } catch (error) {
    console.error('[DeadlineService] Error checking deadlines:', error);
  }
};

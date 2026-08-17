import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getTeamProductivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const employees = await prisma.employee.findMany({
            where: { status: 'ACTIVE' },
            include: {
                tasks: true
            }
        });

        const now = new Date();

        const productivity = employees.map(emp => {
            const tasks = emp.tasks;
            const totalTasks = tasks.length;
            const completed = tasks.filter(t => t.status === 'COMPLETED').length;
            const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
            
            const overdue = tasks.filter(t => 
                t.status !== 'COMPLETED' && 
                t.deadline && 
                new Date(t.deadline) < now
            ).length;

            const score = Math.round((completionRate * 0.6) - (overdue * 2));

            return {
                id: emp.id,
                name: emp.name,
                totalTasks,
                completed,
                completionRate,
                overdue,
                score
            };
        });

        res.status(200).json(productivity);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getProjectHealth = async (req: Request, res: Response): Promise<void> => {
    try {
        const tasks = await prisma.task.findMany();
        
        let onTime = 0;
        let late = 0;
        let pending = 0;

        tasks.forEach((task: any) => {
            if (task.status !== 'COMPLETED') {
                pending++;
            } else {
                if (task.completedAt && task.deadline) {
                    if (new Date(task.completedAt) <= new Date(task.deadline)) {
                        onTime++;
                    } else {
                        late++;
                    }
                } else {
                    // For legacy data where completedAt is null, assume onTime if it was completed
                    onTime++;
                }
            }
        });

        res.status(200).json({ onTime, late, pending });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

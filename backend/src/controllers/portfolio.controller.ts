import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

interface AuthRequest extends Request {
    user?: any;
}

const portfolioProjectSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    projectLink: z.string().optional().nullable(),
    technologiesUsed: z.string().optional().nullable(),
    completionDate: z.string().optional().nullable(),
});

export const getPortfolioProjects = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const projects = await prisma.portfolioProject.findMany({
            include: {
                createdBy: {
                    select: { name: true, employeeId: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(projects);
    } catch (error) {
        console.error('Get portfolio projects error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio projects' });
    }
};

export const getPortfolioProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const project = await prisma.portfolioProject.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: { name: true, employeeId: true }
                }
            }
        });

        if (!project) {
            res.status(404).json({ error: 'Portfolio project not found' });
            return;
        }

        res.status(200).json(project);
    } catch (error) {
        console.error('Get portfolio project error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio project' });
    }
};

export const createPortfolioProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const validatedData = portfolioProjectSchema.parse(req.body);
        
        const completionDate = validatedData.completionDate ? new Date(validatedData.completionDate) : null;

        const project = await prisma.portfolioProject.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                projectLink: validatedData.projectLink,
                technologiesUsed: validatedData.technologiesUsed,
                completionDate: completionDate,
                createdById: req.user.id
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create portfolio project error:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
            return;
        }
        res.status(500).json({ error: 'Failed to create portfolio project' });
    }
};

export const updatePortfolioProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const validatedData = portfolioProjectSchema.parse(req.body);

        const existingProject = await prisma.portfolioProject.findUnique({ where: { id } });
        if (!existingProject) {
            res.status(404).json({ error: 'Portfolio project not found' });
            return;
        }

        const completionDate = validatedData.completionDate ? new Date(validatedData.completionDate) : null;

        const project = await prisma.portfolioProject.update({
            where: { id },
            data: {
                title: validatedData.title,
                description: validatedData.description,
                projectLink: validatedData.projectLink,
                technologiesUsed: validatedData.technologiesUsed,
                completionDate: completionDate,
            }
        });

        res.status(200).json(project);
    } catch (error) {
        console.error('Update portfolio project error:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
            return;
        }
        res.status(500).json({ error: 'Failed to update portfolio project' });
    }
};

export const deletePortfolioProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        
        const existingProject = await prisma.portfolioProject.findUnique({ where: { id } });
        if (!existingProject) {
            res.status(404).json({ error: 'Portfolio project not found' });
            return;
        }

        await prisma.portfolioProject.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Portfolio project deleted successfully' });
    } catch (error) {
        console.error('Delete portfolio project error:', error);
        res.status(500).json({ error: 'Failed to delete portfolio project' });
    }
};

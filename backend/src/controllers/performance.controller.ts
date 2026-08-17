import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getEmployeeReviews = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  try {
    const reviews = await (prisma as any).performanceReview.findMany({
      where: { employeeId },
      include: {
        reviewer: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
};

export const createReview = async (req: Request, res: Response) => {
  const { employeeId, rating, feedback, period } = req.body;
  const reviewerId = (req as any).user.id;
  const userRole = (req as any).user.role;

  if (!['ADMIN', 'MANAGER', 'HR'].includes(userRole)) {
    return res.status(403).json({ message: 'Unauthorized to submit reviews' });
  }

  try {
    const review = await (prisma as any).performanceReview.create({
      data: {
        employeeId,
        reviewerId,
        rating: parseInt(rating),
        feedback,
        period,
      },
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error });
  }
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await (prisma as any).performanceReview.findMany({
      include: {
        employee: { select: { id: true, name: true, department: true } },
        reviewer: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all reviews', error });
  }
};

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: any;
}

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    const total = await prisma.notification.count({ where: { userId: req.user.id } });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });

    res.status(200).json({ notifications, total, unreadCount, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const unreadCount = await prisma.notification.count({ 
      where: { 
        userId: req.user.id, 
        isRead: false 
      } 
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id: id as string },
      data: { isRead: true }
    });

    res.status(200).json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { 
         userId: req.user.id,
         isRead: false 
      },
      data: { isRead: true }
    });

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

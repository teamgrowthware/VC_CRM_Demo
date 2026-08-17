import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { emitToRoom } from '../services/socket.service';
import { createNotification } from '../services/notification.service';

interface AuthRequest extends Request {
  user?: any;
}

export const createChatRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, type, memberIds } = req.body;
    const authorId = req.user.id;

    // For direct chats, a target member is required
    const roomType = type || 'PERSONAL';
    if (roomType === 'PERSONAL' && (!memberIds || memberIds.length === 0)) {
      res.status(400).json({ error: 'A target user is required for a direct chat' });
      return;
    }

    // Ensure author is included in memberIds if not already
    const allMemberIds = Array.from(new Set([...(memberIds || []), authorId]));

    // If it's a personal chat, check if a room already exists with these exact members
        const existingRoom = await prisma.chatRoom.findFirst({
          where: {
            type: 'PERSONAL',
            AND: [
              { members: { some: { employeeId: authorId } } },
              { members: { some: { employeeId: memberIds[0] } } }
            ],
          },
          include: {
            members: { include: { employee: { select: { name: true, employeeId: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        });

       if (existingRoom) {
         res.status(200).json({ message: 'Room already exists', chatRoom: existingRoom });
         return;
       }

    const chatRoom = await prisma.chatRoom.create({
      data: {
        name,
        description: req.body.description,
        avatarUrl: req.body.avatarUrl,
        type: roomType,
        createdBy: authorId,
        members: {
          create: allMemberIds.map((id: string) => ({ 
            employeeId: id,
            isAdmin: id === authorId // Creator is admin
          })),
        },
      },
      include: {
        members: { include: { employee: { select: { name: true, employeeId: true } } } },
      },
    });

    res.status(201).json({ message: 'Chat room created successfully', chatRoom });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, content, receiverId, fileUrl, fileType, mentions } = req.body;
    const senderId = req.user.id;

    // Verify room membership
    const membership = await prisma.chatMember.findUnique({
      where: { roomId_employeeId: { roomId, employeeId: senderId } },
    });
    
    if (!membership) {
       res.status(403).json({ error: 'You are not a member of this chat room' });
       return;
    }

    const newMessage = await prisma.message.create({
      data: {
        roomId,
        senderId,
        receiverId,
        content,
        fileUrl,
        fileType,
        mentions: mentions && mentions.length > 0 ? {
          create: mentions.map((id: string) => ({ employeeId: id }))
        } : undefined
      },
      include: {
        sender: { select: { name: true, employeeId: true } },
        mentions: true
      },
    });

    // Extract room members to determine offline notices
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    
    // Broadcast message broadly locally
    emitToRoom(roomId, 'receiveMessage', newMessage);

    // Create system notification for members (excluding sender)
    const members = room?.members || [];
    for (const m of members) {
       if (m.employeeId !== senderId) {
          await createNotification(
             m.employeeId,
             'COMMENT_ADDED' as any,
             `You have a new message from ${newMessage.sender.name}`,
             `/dashboard/chat`
          );
       }
    }

    res.status(201).json({ message: 'Message sent successfully', newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getMyChatRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const rooms = await prisma.chatRoom.findMany({
      where: {
        isDeleted: false,
        members: {
          some: { employeeId },
        },
      },
      include: {
        members: {
          where: {
            OR: [
              { employeeId }, // Always include the current user
              { room: { type: { in: ['PERSONAL', 'GROUP'] } } } // For chats, include the other members
            ]
          },
          include: { employee: { select: { name: true, employeeId: true } } }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.status(200).json(rooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

export const getMessagesByRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string;
    const userId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: { roomId_employeeId: { roomId, employeeId: userId } },
    });

    if (!membership) {
        res.status(403).json({ error: 'You are not a member of this chat room' });
        return;
    }

    const query: any = {
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { name: true, employeeId: true } },
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const messagesDesc = await prisma.message.findMany(query);
    // Reverse them to chronological frontend view
    const messages = messagesDesc.reverse();

    res.status(200).json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const uploadChatFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const folder = isImage ? 'images' : 'files';
    const fileUrl = `/uploads/chat/${folder}/${req.file.filename}`;

    res.status(200).json({
      url: fileUrl,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload chat file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Advanced Group Management
export const updateGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { name, description, avatarUrl, isArchived } = req.body;
    const userId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: { roomId_employeeId: { roomId, employeeId: userId } },
    });

    if (!membership || (!membership.isAdmin && req.user.role !== 'ADMIN')) {
       res.status(403).json({ error: 'Not authorized to update this group' });
       return;
    }

    const updated = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { name, description, avatarUrl, isArchived }
    });

    emitToRoom(roomId, 'roomUpdated', updated);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const softDeleteGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    if (req.user.role !== 'ADMIN') {
       res.status(403).json({ error: 'Only admins can delete groups' });
       return;
    }

    const deleted = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { isDeleted: true }
    });
    
    emitToRoom(roomId, 'roomDeleted', { roomId });
    res.status(200).json(deleted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

export const restoreGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    if (req.user.role !== 'ADMIN') {
       res.status(403).json({ error: 'Only admins can restore groups' });
       return;
    }

    const restored = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { isDeleted: false }
    });
    
    emitToRoom(roomId, 'roomRestored', restored);
    res.status(200).json(restored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore group' });
  }
};

export const updateChatPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { isPinned, isFavorite, isMuted, priority, lastReadAt } = req.body;
    const userId = req.user.id;

    const updated = await prisma.chatMember.update({
      where: { roomId_employeeId: { roomId, employeeId: userId } },
      data: { isPinned, isFavorite, isMuted, priority, lastReadAt }
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

export const addGroupMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { employeeId } = req.body;
    const userId = req.user.id;

    const callerMembership = await prisma.chatMember.findUnique({
      where: { roomId_employeeId: { roomId, employeeId: userId } },
    });

    if (!callerMembership || (!callerMembership.isAdmin && req.user.role !== 'ADMIN')) {
       res.status(403).json({ error: 'Not authorized to add members' });
       return;
    }

    const newMember = await prisma.chatMember.create({
      data: { roomId, employeeId },
      include: { employee: { select: { name: true, employeeId: true } } }
    });

    emitToRoom(roomId, 'memberAdded', { roomId, member: newMember });
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const removeGroupMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const memberIdToRemove = req.params.userId as string;
    const userId = req.user.id;

    // Users can remove themselves, but to remove others, they must be admin
    if (memberIdToRemove !== userId) {
      const callerMembership = await prisma.chatMember.findUnique({
        where: { roomId_employeeId: { roomId, employeeId: userId } },
      });

      if (!callerMembership || (!callerMembership.isAdmin && req.user.role !== 'ADMIN')) {
         res.status(403).json({ error: 'Not authorized to remove members' });
         return;
      }
    }

    await prisma.chatMember.delete({
      where: { roomId_employeeId: { roomId, employeeId: memberIdToRemove } }
    });

    emitToRoom(roomId, 'memberRemoved', { roomId, employeeId: memberIdToRemove });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

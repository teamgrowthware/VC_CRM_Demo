import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { emitToRoom } from '../services/socket.service';
import { createNotification } from '../services/notification.service';

interface AuthRequest extends Request {
  user?: any;
}

const isClientUser = (user: any) => user?.role === 'CLIENT';

const findMembership = async (roomId: string, user: any) => {
  return prisma.chatMember.findFirst({
    where: isClientUser(user)
      ? { roomId, clientId: user.id }
      : { roomId, employeeId: user.id },
  });
};

const memberInclude = {
  employee: { select: { name: true, employeeId: true } },
  client: { select: { name: true, clientId: true, company: true } },
};

// Team members (manager + project members) for all projects assigned to a client.
// Clients may only chat with their own project team.
const getClientTeamEmployeeIds = async (clientId: string): Promise<Set<string>> => {
  const projects = await prisma.project.findMany({
    where: { clientId },
    select: {
      manager: { select: { id: true } },
      members: { select: { employeeId: true } },
    },
  });
  const ids = new Set<string>();
  projects.forEach((p) => {
    ids.add(p.manager.id);
    p.members.forEach((m) => ids.add(m.employeeId));
  });
  return ids;
};

export const createChatRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, type, memberIds, clientId } = req.body;
    const authorId = req.user.id;
    const isClient = isClientUser(req.user);

    // For direct chats, a target member is required (either employee or client)
    const roomType = type || 'PERSONAL';
    if (roomType === 'PERSONAL' && (!memberIds || memberIds.length === 0) && !clientId) {
      res.status(400).json({ error: 'A target user is required for a direct chat' });
      return;
    }

    // Clients may only open direct chats with members of their assigned projects
    if (isClient && roomType === 'PERSONAL') {
      const teamIds = await getClientTeamEmployeeIds(authorId);
      const invalid = memberIds.filter((id: string) => !teamIds.has(id));
      if (invalid.length > 0) {
        res.status(403).json({ error: 'You can only chat with your project team' });
        return;
      }
    }

    // Ensure author is included in memberIds if not already (employee author)
    const allMemberIds = Array.from(new Set([...(memberIds || []), ...(isClient ? [] : [authorId])]));

    // If it's a personal chat, check if a room already exists with these exact members
    const targetEmployeeId = memberIds && memberIds.length > 0 ? memberIds[0] : null;
    const targetClientId = clientId || null;
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'PERSONAL',
        AND: isClient
          ? [
              { members: { some: { clientId: authorId } } },
              { members: { some: { employeeId: targetEmployeeId } } },
            ]
          : targetClientId
            ? [
                { members: { some: { employeeId: authorId } } },
                { members: { some: { clientId: targetClientId } } },
              ]
            : [
                { members: { some: { employeeId: authorId } } },
                { members: { some: { employeeId: targetEmployeeId } } },
              ],
      },
      include: {
        members: { include: memberInclude },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existingRoom) {
      res.status(200).json({ message: 'Room already exists', chatRoom: existingRoom });
      return;
    }

    const memberData: any[] = [];
    if (isClient) {
      memberData.push({ clientId: authorId, isAdmin: true });
    }
    allMemberIds.forEach((id: string) => {
      memberData.push({ employeeId: id, isAdmin: id === authorId });
    });
    if (!isClient && clientId) {
      memberData.push({ clientId, isAdmin: false });
    }

    const chatRoom = await prisma.chatRoom.create({
      data: {
        name,
        description: req.body.description,
        avatarUrl: req.body.avatarUrl,
        type: roomType,
        createdBy: authorId,
        members: { create: memberData },
      },
      include: { members: { include: memberInclude } },
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
    const isClient = isClientUser(req.user);

    // Verify room membership
    const membership = await findMembership(roomId, req.user);
    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this chat room' });
      return;
    }

    // The DM "receiver" may be an Employee or a Client — resolve against both.
    let receiverEmployeeId: string | null = null;
    let receiverClientId: string | null = null;
    if (receiverId) {
      const emp = await prisma.employee.findUnique({ where: { id: receiverId }, select: { id: true } });
      if (emp) {
        receiverEmployeeId = receiverId;
      } else {
        const cl = await prisma.client.findUnique({ where: { id: receiverId }, select: { id: true } });
        if (cl) receiverClientId = receiverId;
      }
    }

    const newMessage = await prisma.message.create({
      data: {
        roomId,
        senderId: isClient ? null : senderId,
        senderClientId: isClient ? senderId : null,
        receiverId: receiverEmployeeId,
        receiverClientId,
        content,
        fileUrl,
        fileType,
        mentions: mentions && mentions.length > 0
          ? { create: mentions.map((id: string) => ({ employeeId: id })) }
          : undefined,
      },
      include: {
        sender: { select: { name: true, employeeId: true } },
        senderClient: { select: { name: true, clientId: true } },
        mentions: { include: { employee: { select: { id: true, name: true } } } },
      },
    });

    // Extract room members to determine offline notices
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    // Broadcast message broadly locally
    emitToRoom(roomId, 'receiveMessage', newMessage);

    // Create system notification for employee members (excluding the sender)
    const senderName = newMessage.sender?.name || newMessage.senderClient?.name || 'Unknown';
    const members = room?.members || [];

    // Notify mentioned employees specifically
    if (mentions && mentions.length > 0) {
      for (const mentionedId of mentions) {
        if (mentionedId !== senderId) {
          await createNotification(
            mentionedId,
            'COMMENT_ADDED' as any,
            `${senderName} mentioned you in a chat: "${content.substring(0, 100)}"`,
            `/dashboard/chat`
          );
        }
      }
    }

    // General notification for other members
    for (const m of members) {
      if (m.employeeId && m.employeeId !== senderId) {
        await createNotification(
          m.employeeId,
          'COMMENT_ADDED' as any,
          `You have a new message from ${senderName}`,
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

export const getChatClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, company: true, clientId: true }
    });
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat clients' });
  }
};

export const getMyChatRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const isClient = isClientUser(req.user);
    const rooms = await prisma.chatRoom.findMany({
      where: {
        isDeleted: false,
        members: {
          some: isClient ? { clientId: userId } : { employeeId: userId },
        },
      },
      include: {
        members: {
          where: isClient
            ? {
                OR: [
                  { clientId: userId },
                  { room: { type: { in: ['PERSONAL', 'GROUP'] } } },
                ],
              }
            : {
                OR: [
                  { employeeId: userId },
                  { room: { type: { in: ['PERSONAL', 'GROUP'] } } },
                ],
              },
          include: memberInclude,
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
    const roomId = String(req.params.roomId);
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string;
    const userId = req.user.id;
    const isClient = isClientUser(req.user);

    const membership = await prisma.chatMember.findFirst({
      where: isClient ? { roomId, clientId: userId } : { roomId, employeeId: userId },
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
        senderClient: { select: { name: true, clientId: true } },
        mentions: { include: { employee: { select: { id: true, name: true } } } },
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
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload chat file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Advanced Group Management
export const updateGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId);
    const { name, description, avatarUrl, isArchived } = req.body;

    const membership = await findMembership(roomId, req.user);
    if (!membership || (!membership.isAdmin && req.user.role !== 'ADMIN')) {
      res.status(403).json({ error: 'Not authorized to update this group' });
      return;
    }

    const updated = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { name, description, avatarUrl, isArchived },
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
    const roomId = String(req.params.roomId);
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can delete groups' });
      return;
    }

    const deleted = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { isDeleted: true },
    });

    emitToRoom(roomId, 'roomDeleted', { roomId });
    res.status(200).json(deleted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

export const restoreGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId);
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can restore groups' });
      return;
    }

    const restored = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { isDeleted: false },
    });

    emitToRoom(roomId, 'roomRestored', restored);
    res.status(200).json(restored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore group' });
  }
};

export const updateChatPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId);
    const { isPinned, isFavorite, isMuted, priority, lastReadAt } = req.body;

    const membership = await findMembership(roomId, req.user);
    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this chat room' });
      return;
    }

    const updated = await prisma.chatMember.update({
      where: { id: membership.id },
      data: { isPinned, isFavorite, isMuted, priority, lastReadAt },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

export const addGroupMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId);
    const { employeeId, clientId } = req.body;

    const callerMembership = await findMembership(roomId, req.user);
    if (!callerMembership || (!callerMembership.isAdmin && req.user.role !== 'ADMIN')) {
      res.status(403).json({ error: 'Not authorized to add members' });
      return;
    }

    const newMember = await prisma.chatMember.create({
      data: { roomId, employeeId: employeeId || null, clientId: clientId || null },
      include: memberInclude,
    });

    emitToRoom(roomId, 'memberAdded', { roomId, member: newMember });
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const removeGroupMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId);
    const memberIdToRemove = String(req.params.userId);
    const userId = req.user.id;

    // Users can remove themselves, but to remove others, they must be admin
    if (memberIdToRemove !== userId) {
      const callerMembership = await findMembership(roomId, req.user);
      if (!callerMembership || (!callerMembership.isAdmin && req.user.role !== 'ADMIN')) {
        res.status(403).json({ error: 'Not authorized to remove members' });
        return;
      }
    }

    await prisma.chatMember.deleteMany({
      where: {
        roomId,
        OR: [{ employeeId: memberIdToRemove }, { clientId: memberIdToRemove }],
      },
    });

    emitToRoom(roomId, 'memberRemoved', { roomId, employeeId: memberIdToRemove });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

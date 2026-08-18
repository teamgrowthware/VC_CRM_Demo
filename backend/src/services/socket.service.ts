import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server | null = null;
import { requireJwtSecret } from '../lib/config';

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers?.cookie;
      let cookieToken: string | null = null;
      if (cookies) {
        const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
        cookieToken = match ? decodeURIComponent(match[1]) : null;
      }
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1] || cookieToken;
      if (!token) {
        return next(new Error('Authentication Error'));
      }
      const decoded = jwt.verify(token, requireJwtSecret()) as any;
      socket.data.user = decoded;
      next();
    } catch (e) {
      next(new Error('Authentication Error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.userId || socket.data.user?.id;
    if (userId) {
      // Connect specifically to their UUID stream
      socket.join(userId);
      console.log(`Socket connected: User ${userId} joined their stream`);
    }

    // Chat room socket events
    socket.on('joinRoom', async (roomId: string) => {
      if (!userId) return;
      // Fetch from Prisma dynamically ignoring caching to ensure strict membership
      try {
        const prisma = (await import('../lib/prisma')).default;
        const isClient = socket.data.user?.role === 'CLIENT';
        const membership = await prisma.chatMember.findFirst({
          where: isClient ? { roomId, clientId: userId } : { roomId, employeeId: userId },
        });
        
        if (membership) {
          socket.join(`room_${roomId}`);
          console.log(`Socket: User ${userId} authorized to join room_${roomId}`);
        } else {
          socket.emit('error', 'Unauthorized to join room');
        }
      } catch (e) {
        console.error('Socket joinRoom error:', e);
      }
    });

    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(`room_${roomId}`);
    });

    socket.on('typingStart', async (data: { roomId: string, userName: string }) => {
      // Validate logically that user is still inside the room socket-wise
      if (socket.rooms.has(`room_${data.roomId}`)) {
        socket.to(`room_${data.roomId}`).emit('typingStart', data);
      }
    });

    socket.on('typingStop', (data: { roomId: string, userName: string }) => {
      if (socket.rooms.has(`room_${data.roomId}`)) {
        socket.to(`room_${data.roomId}`).emit('typingStop', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: User ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

export const emitToRoom = (roomId: string, event: string, data: any) => {
  if (io) {
    io.to(`room_${roomId}`).emit(event, data);
  }
};

export const broadcastEvent = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};

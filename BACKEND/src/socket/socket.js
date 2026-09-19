import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt.util.js';
import Ticket from '../models/Ticket.js';

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);

      socket.user = decoded;

      next();
    } catch (error) {
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    console.log(`👤 User: ${socket.user.userId}`);
    console.log(`🔑 Role: ${socket.user.role}`);

    // Join Ticket Room with Server-Side Authorization
    socket.on('join-ticket', async (data, callback) => {
      try {
        const target = typeof data === 'string' ? data : (data?.ticketId || data?.ticketNumber);

        if (!target) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'Ticket ID is required' });
          }
          return;
        }

        const isObjectId = mongoose.Types.ObjectId.isValid(target);
        const query = isObjectId ? { _id: target } : { ticketNumber: target };
        const ticket = await Ticket.findOne(query);

        if (!ticket) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'Ticket not found' });
          }
          return;
        }

        const userRole = (socket.user.role || '').toLowerCase();
        const userId = socket.user.userId;

        let isAuthorized = false;

        if (userRole === 'admin') {
          isAuthorized = true;
        } else if (userRole === 'customer') {
          if (String(ticket.customerId) === String(userId)) {
            isAuthorized = true;
          }
        } else if (userRole === 'agent') {
          if (ticket.assignedTo && String(ticket.assignedTo) === String(userId)) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          const errorMsg =
            userRole === 'customer'
              ? 'Access denied: You do not own this ticket'
              : userRole === 'agent'
              ? (!ticket.assignedTo
                  ? 'Access denied: Ticket is unassigned'
                  : 'Access denied: You are not assigned to this ticket')
              : 'Access denied: Unauthorized';

          console.warn(`⛔ [Socket] Join denied for user ${userId} (${userRole}) on ticket ${ticket.ticketNumber}: ${errorMsg}`);

          if (typeof callback === 'function') {
            return callback({ success: false, message: errorMsg });
          }
          return;
        }

        const room = `ticket:${ticket.ticketNumber}`;
        const idRoom = `ticket:${ticket._id.toString()}`;
        socket.join(room);
        socket.join(idRoom);

        console.log(`🎟️ [Socket] User ${userId} (${userRole}) joined room: ${room}`);

        if (typeof callback === 'function') {
          return callback({
            success: true,
            room,
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
          });
        }
      } catch (err) {
        console.error('Error in join-ticket handler:', err);
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'Failed to join ticket room' });
        }
      }
    });

    // Leave Ticket Room
    socket.on('leave-ticket', (data, callback) => {
      const target = typeof data === 'string' ? data : (data?.ticketId || data?.ticketNumber);
      if (target) {
        socket.leave(`ticket:${target}`);
      }
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }

  return io;
};

export default initializeSocket;

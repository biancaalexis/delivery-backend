const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;
const connectedUsers = new Map();

const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userRole})`);
    
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      role: socket.userRole,
      name: socket.userName,
      connectedAt: new Date()
    });

    socket.join(`user_${socket.userId}`);
    socket.join(`role_${socket.userRole}`);

    socket.emit('connection-success', {
      userId: socket.userId,
      role: socket.userRole,
      message: 'Connected to FastBite real-time service'
    });

    if (socket.userRole === 'rider') {
      socket.on('location-update', (data) => {
        socket.broadcast.emit('rider-location-update', {
          riderId: socket.userId,
          riderName: socket.userName,
          ...data
        });
      });
    }

    socket.on('join-order-room', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`User ${socket.userName} joined order room: ${orderId}`);
    });

    socket.on('leave-order-room', (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`User ${socket.userName} left order room: ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName}`);
      connectedUsers.delete(socket.userId);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  try {
    const io = getIO();
    io.to(`user_${userId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to user ${userId}`);
  } catch (error) {
    console.error('Error emitting to user:', error.message);
  }
};

const emitToRole = (role, event, data) => {
  try {
    const io = getIO();
    io.to(`role_${role}`).emit(event, data);
    console.log(`📤 Emitted ${event} to role ${role}`);
  } catch (error) {
    console.error('Error emitting to role:', error.message);
  }
};

const emitToOrder = (orderId, event, data) => {
  try {
    const io = getIO();
    io.to(`order_${orderId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to order ${orderId}`);
  } catch (error) {
    console.error('Error emitting to order:', error.message);
  }
};

const broadcastToAll = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
    console.log(`📤 Broadcasted ${event} to all users`);
  } catch (error) {
    console.error('Error broadcasting:', error.message);
  }
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.entries()).map(([userId, data]) => ({
    userId,
    ...data
  }));
};

const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

module.exports = {
  initializeWebSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToOrder,
  broadcastToAll,
  getConnectedUsers,
  isUserOnline
};
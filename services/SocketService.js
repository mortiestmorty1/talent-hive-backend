import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Map to store user ID to socket ID mapping
  }

  async initialize(server) {
    const { Server } = await import('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: process.env.PUBLIC_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
    
    console.log('✅ WebSocket server initialized');
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  }

  handleConnection(socket) {
    console.log(`🔌 User ${socket.userId} connected`);
    
    // Store user socket mapping
    this.userSockets.set(socket.userId, socket.id);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Handle joining order rooms
    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`👥 User ${socket.userId} joined order room: order_${orderId}`);
    });

    // Handle joining job rooms
    socket.on('join_job', (jobId) => {
      socket.join(`job_${jobId}`);
      console.log(`👥 User ${socket.userId} joined job room: job_${jobId}`);
    });

    // Handle leaving rooms
    socket.on('leave_order', (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`👋 User ${socket.userId} left order room: order_${orderId}`);
    });

    socket.on('leave_job', (jobId) => {
      socket.leave(`job_${jobId}`);
      console.log(`👋 User ${socket.userId} left job room: job_${jobId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
      this.userSockets.delete(socket.userId);
    });
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  // Emit to all users in an order room
  emitToOrder(orderId, event, data) {
    if (this.io) {
      this.io.to(`order_${orderId}`).emit(event, data);
    }
  }

  // Emit to all users in a job room
  emitToJob(jobId, event, data) {
    if (this.io) {
      this.io.to(`job_${jobId}`).emit(event, data);
    }
  }

  // Emit to multiple users
  emitToUsers(userIds, event, data) {
    if (this.io) {
      userIds.forEach(userId => {
        this.io.to(`user_${userId}`).emit(event, data);
      });
    }
  }

  // Order-related real-time events
  async emitOrderUpdate(orderId, updateType, data) {
    try {
      // Get order details to find participants
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: { select: { id: true } },
          gig: {
            include: {
              createdBy: { select: { id: true } }
            }
          }
        }
      });

      if (order) {
        const participants = [order.buyer.id, order.gig.createdBy.id];
        
        this.emitToOrder(orderId, 'order_update', {
          orderId,
          updateType,
          data,
          timestamp: new Date().toISOString()
        });

        // Also emit to individual users for immediate updates
        this.emitToUsers(participants, 'order_updated', {
          orderId,
          updateType,
          data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error emitting order update:', error);
    }
  }

  // Job-related real-time events
  async emitJobUpdate(jobId, updateType, data) {
    try {
      // Get job details to find participants
      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          client: { select: { id: true } },
          applications: {
            where: { status: 'ACCEPTED' },
            include: {
              freelancer: { select: { id: true } }
            }
          }
        }
      });

      if (job) {
        const participants = [job.client.id];
        if (job.applications.length > 0) {
          participants.push(job.applications[0].freelancer.id);
        }

        this.emitToJob(jobId, 'job_update', {
          jobId,
          updateType,
          data,
          timestamp: new Date().toISOString()
        });

        // Also emit to individual users for immediate updates
        this.emitToUsers(participants, 'job_updated', {
          jobId,
          updateType,
          data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error emitting job update:', error);
    }
  }

  // Message-related events
  emitMessage(orderId, message) {
    this.emitToOrder(orderId, 'new_message', {
      orderId,
      message,
      timestamp: new Date().toISOString()
    });
  }

  emitJobMessage(jobId, message) {
    this.emitToJob(jobId, 'new_job_message', {
      jobId,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Milestone events
  emitMilestoneUpdate(orderId, milestoneData) {
    this.emitToOrder(orderId, 'milestone_update', {
      orderId,
      milestone: milestoneData,
      timestamp: new Date().toISOString()
    });
  }

  emitJobMilestoneUpdate(jobId, milestoneData) {
    this.emitToJob(jobId, 'job_milestone_update', {
      jobId,
      milestone: milestoneData,
      timestamp: new Date().toISOString()
    });
  }

  // Status change events
  emitOrderStatusChange(orderId, newStatus, data) {
    this.emitToOrder(orderId, 'order_status_change', {
      orderId,
      newStatus,
      data,
      timestamp: new Date().toISOString()
    });
  }

  emitJobStatusChange(jobId, newStatus, data) {
    this.emitToJob(jobId, 'job_status_change', {
      jobId,
      newStatus,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Get instance for use in other files
  static getInstance() {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }
}

export default SocketService.getInstance();

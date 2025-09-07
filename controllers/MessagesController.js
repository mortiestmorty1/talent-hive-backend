import prisma from "../prisma/client.js";

export const addMessage = async (req, res, next) => {
  try {
    const { receiverId, message } = req.body;
    const { orderId } = req.params;
    
    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required." });
    }

    if (!receiverId) {
      return res.status(400).json({ error: "receiverId is required." });
    }

    // Create message for order (existing gig functionality)
    const messageData = await prisma.messages.create({
      data: {
        sender: {
          connect: { id: req.userId },
        },
        receiver: {
          connect: { id: receiverId },
        },
        order: {
          connect: { id: orderId },
        },
        text: message,
      },
    });
    
    return res.status(201).json({ message: messageData });
  } catch (err) {
    console.error("Error adding message:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// New function for job messaging
export const addJobMessage = async (req, res) => {
  try {
    const { message, jobId } = req.body;
    
    if (!message || !jobId) {
      return res.status(400).json({ error: "message and jobId are required." });
    }

    // Get job to determine the other party (same logic as getJobMessages)
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { 
            status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    let receiverId;
    const isClient = job.clientId === req.userId;
    
    if (isClient) {
      // Client is sending message, find the accepted freelancer
      const acceptedApp = job.applications.find(app => 
        ['ACCEPTED', 'IN_PROGRESS'].includes(app.status)
      );
      if (!acceptedApp) {
        return res.status(400).json({ error: "No accepted freelancer found for this job." });
      }
      receiverId = acceptedApp.freelancerId;
    } else {
      // Check if user is an accepted freelancer
      const userApplication = job.applications.find(app => 
        app.freelancerId === req.userId && ['ACCEPTED', 'IN_PROGRESS'].includes(app.status)
      );
      if (!userApplication) {
        return res.status(403).json({ error: "You can only message for accepted jobs you're working on." });
      }
      receiverId = job.clientId;
    }

    const messageData = await prisma.messages.create({
      data: {
        senderId: req.userId,
        receiverId: receiverId,
        jobId: jobId,
        text: message,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });

    return res.status(201).json({ message: messageData });
  } catch (err) {
    console.error("Error adding job message:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { jobId } = req.query;
    
    if (orderId && req.userId) {
      const messages = await prisma.messages.findMany({
        where: {
          order: {
            id: orderId,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          }
        }
      });

      await prisma.messages.updateMany({
        where: {
          orderId: orderId,
          receiverId: req.userId,
        },
        data: {
          isRead: true,
        },
      });
      
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { gig: true },
      });
      
      let receiverId;
      if (order?.buyerId === req.userId) {
        receiverId = order.gig.userId;
      } else if (order?.gig.userId === req.userId) {
        receiverId = order.buyerId;
      }
      return res.status(200).json({ messages, receiverId });
    }
    
    if (jobId && req.userId) {
      return getJobMessages(req, res, jobId);
    }
    
    return res.status(400).send("Order id or job id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const getJobMessages = async (req, res, jobId) => {
  try {
    // Get job and check access
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        client: true,
        applications: {
          where: { 
            status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
          },
          include: {
            freelancer: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Determine the receiver ID (like gig messaging does)
    let receiverId;
    const isClient = job.clientId === req.userId;
    
    if (isClient) {
      // Client is accessing messages, find the accepted freelancer
      const acceptedApp = job.applications.find(app => 
        ['ACCEPTED', 'IN_PROGRESS'].includes(app.status)
      );
      if (acceptedApp) {
        receiverId = acceptedApp.freelancerId;
      }
    } else {
      // Check if user is an accepted freelancer
      const userApplication = job.applications.find(app => 
        app.freelancerId === req.userId && ['ACCEPTED', 'IN_PROGRESS'].includes(app.status)
      );
      if (userApplication) {
        receiverId = job.clientId;
      }
    }

    // Check if user has access to this job's messages
    if (!receiverId) {
      return res.status(403).json({ error: "Access denied. Only clients and accepted freelancers can access job messages." });
    }

    const messages = await prisma.messages.findMany({
      where: {
        jobId: jobId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });

    // Mark messages as read
    await prisma.messages.updateMany({
      where: {
        jobId: jobId,
        receiverId: req.userId,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({ messages, receiverId });
  } catch (err) {
    console.error("Error getting job messages:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

export const getUnreadMessages = async (req, res, next) => {
  try {
    if (req.userId) {
      const messages = await prisma.messages.findMany({
        where: {
          receiverId: req.userId,
          isRead: false,
        },
        include: {
          sender: true,
        },
      });
      return res.status(200).json({ messages });
    }
    return res.status(400).send("User id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    if (req.userId && req.params.messageId) {
      await prisma.messages.update({
        where: { id: parseInt(req.params.messageId) },
        data: { isRead: true },
      });
      return res.status(200).send("Message mark as read.");
    }
    return res.status(400).send("User id and message Id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

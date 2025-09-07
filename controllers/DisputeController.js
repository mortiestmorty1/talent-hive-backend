import prisma from "../prisma/client.js";

export const openDispute = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId || !reason) return res.status(400).send("orderId and reason are required");
    
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).send("Order not found");
    
    // Check if user is authorized to open dispute for this order
    if (order.buyerId !== req.userId && order.gigId) {
      const gig = await prisma.gig.findUnique({ where: { id: order.gigId } });
      if (gig?.userId !== req.userId && order.buyerId !== req.userId) {
        return res.status(403).send("Not authorized to open dispute for this order");
      }
    }
    
    // Check if there's already an existing dispute for this order
    const existingDispute = await prisma.dispute.findFirst({
      where: { orderId },
      select: { id: true, status: true, initiatorId: true }
    });
    
    if (existingDispute) {
      return res.status(400).send(`A dispute already exists for this order. Dispute ID: ${existingDispute.id}, Status: ${existingDispute.status}`);
    }
    
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        initiatorId: req.userId,
        reason,
        description,
        evidence: [],
      },
    });
    return res.status(201).json(dispute);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadEvidence = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) return res.status(404).send("Dispute not found");
    
    // Check if user is authorized (initiator or assigned mediator)
    const isAuthorized = dispute.initiatorId === req.userId || 
                        (req.userIsMediator && dispute.mediatorId === req.userId);
    
    if (!isAuthorized) return res.status(403).send("Not authorized");
    
    const files = (req.files || []).map((f) => f.path.replace(/^uploads\//, ""));
    const updated = await prisma.dispute.update({ where: { id: disputeId }, data: { evidence: { push: files } } });
    return res.status(200).json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const assignMediator = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { mediatorId } = req.body;
    if (!mediatorId) return res.status(400).send("mediatorId is required");

    // Only a mediator can assign (and only assign themselves for now)
    const caller = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!caller?.isMediator) return res.status(403).send("Only mediators can assign");
    if (mediatorId !== req.userId) return res.status(403).send("You can only assign yourself as mediator");

    // Load dispute with parties
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: true,
      },
    });
    if (!dispute) return res.status(404).send("Dispute not found");

    // Prevent re-assignment
    if (dispute.mediatorId) return res.status(400).send("Mediator already assigned");

    // Validate mediator user exists and has mediator role
    const mediator = await prisma.user.findUnique({ where: { id: mediatorId } });
    if (!mediator?.isMediator) return res.status(400).send("Mediator not valid");

    // Determine parties: initiator, order buyer, order seller (gig owner)
    let buyerId = null;
    let sellerId = null;
    if (dispute.order) {
      buyerId = dispute.order.buyerId || null;
      if (dispute.order.gigId) {
        const gig = await prisma.gig.findUnique({ where: { id: dispute.order.gigId } });
        sellerId = gig?.userId || null;
      }
    }

    const forbiddenParties = [dispute.initiatorId, buyerId, sellerId].filter(Boolean);
    if (forbiddenParties.includes(mediatorId)) {
      return res.status(400).send("Mediator cannot be a party to the dispute");
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: { mediatorId, status: "UNDER_REVIEW" },
    });
    return res.status(200).json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status } = req.body;
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) return res.status(404).send("Dispute not found");
    if (!req.userIsMediator || dispute.mediatorId !== req.userId) return res.status(403).send("Only mediator can update status");
    const updated = await prisma.dispute.update({ where: { id: disputeId }, data: { status } });
    return res.status(200).json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution } = req.body;
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) return res.status(404).send("Dispute not found");
    if (!req.userIsMediator || dispute.mediatorId !== req.userId) return res.status(403).send("Only mediator can resolve");
    const updated = await prisma.dispute.update({ where: { id: disputeId }, data: { status: "RESOLVED", resolution } });
    return res.status(200).json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const postDisputeMessage = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).send("text is required");
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) return res.status(404).send("Dispute not found");
    // Allow initiator, mediator, or the other party in the order
    const order = await prisma.order.findUnique({ where: { id: dispute.orderId } });
    const allowed = [dispute.initiatorId, dispute.mediatorId, order?.buyerId];
    // Add seller if gig exists
    if (order?.gigId) {
      const gig = await prisma.gig.findUnique({ where: { id: order.gigId } });
      if (gig) allowed.push(gig.userId);
    }
    if (!allowed.filter(Boolean).includes(req.userId)) return res.status(403).send("Not authorized");
    
    const msg = await prisma.disputeMessage.create({ 
      data: { text, senderId: req.userId, disputeId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        }
      }
    });
    return res.status(201).json(msg);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const getDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const dispute = await prisma.dispute.findUnique({ 
      where: { id: disputeId }, 
      include: { 
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        initiator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        mediator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true
              }
            },
            gig: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      } 
    });
    if (!dispute) return res.status(404).send("Dispute not found");
    // Transform gig.createdBy -> gig.user for frontend compatibility
    const transformed = {
      ...dispute,
      order: dispute.order
        ? {
            ...dispute.order,
            gig: dispute.order.gig
              ? { ...dispute.order.gig, user: dispute.order.gig.createdBy }
              : null,
          }
        : null,
    };
    return res.status(200).json(transformed);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal Server Error");
  }
};

export const listMyDisputes = async (req, res) => {
  try {
    console.log("Fetching disputes for user:", req.userId);
    
    // First, let's check if there are any disputes at all
    const allDisputes = await prisma.dispute.findMany({});
    console.log(`Total disputes in database: ${allDisputes.length}`);
    
    if (allDisputes.length > 0) {
      console.log("Sample dispute:", JSON.stringify(allDisputes[0], null, 2));
    }
    
    // Get all disputes where the user is involved
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          // User is the initiator
          { initiatorId: req.userId },
          // User is the mediator
          { mediatorId: req.userId },
          // User is the buyer in the order
          {
            order: {
              buyerId: req.userId
            }
          },
          // User is the seller (gig owner) in the order
          {
            order: {
              gig: {
                createdBy: {
                  id: req.userId
                }
              }
            }
          }
        ]
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        mediator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true
              }
            },
            gig: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`Raw disputes found: ${disputes.length}`);
    
    // Transform the data to match expected format
    const transformedDisputes = disputes.map(dispute => ({
      ...dispute,
      order: dispute.order ? {
        ...dispute.order,
        gig: dispute.order.gig ? {
          ...dispute.order.gig,
          user: dispute.order.gig.createdBy
        } : null
      } : null
    }));

    console.log(`Found ${transformedDisputes.length} disputes for user ${req.userId}`);
    return res.status(200).json(transformedDisputes);
  } catch (e) {
    console.error("Error in listMyDisputes:", e);
    console.error("Stack trace:", e.stack);
    
    // If there's an error, try a simpler query first
    try {
      console.log("Trying simplified query...");
      const simpleDisputes = await prisma.dispute.findMany({
        where: {
          OR: [
            { initiatorId: req.userId },
            { mediatorId: req.userId }
          ]
        },
        include: {
          initiator: true,
          mediator: true,
          order: true
        },
        orderBy: { createdAt: "desc" }
      });
      
      console.log(`Found ${simpleDisputes.length} disputes with simple query`);
      return res.status(200).json(simpleDisputes);
    } catch (simpleError) {
      console.error("Simple query also failed:", simpleError);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: simpleError.message,
        userId: req.userId 
      });
    }
  }
};

export const listAllDisputesForMediators = async (req, res) => {
  try {
    // Check if user is a mediator
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.isMediator) {
      return res.status(403).send("Access denied. Only mediators can view all disputes.");
    }

    const disputes = await prisma.dispute.findMany({
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        mediator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true
          }
        },
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true
              }
            },
            gig: {
              select: {
                id: true,
                userId: true,
                title: true,
                createdBy: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true
                  }
                }
              }
            }
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 1 // Get only the latest message for preview
        }
      },
      orderBy: [
        { status: "asc" }, // Prioritize unresolved disputes
        { createdAt: "desc" }
      ],
    });

    // Transform gig.createdBy -> gig.user for frontend compatibility
    const transformed = disputes.map((d) => ({
      ...d,
      order: d.order
        ? {
            ...d.order,
            gig: d.order.gig
              ? { ...d.order.gig, user: d.order.gig.createdBy }
              : null,
          }
        : null,
    }));

    return res.status(200).json(transformed);
  } catch (e) {
    console.error("Error in listAllDisputesForMediators:", e);
    return res.status(500).send("Internal Server Error");
  }
};



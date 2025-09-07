import prisma from "../prisma/client.js";
import Stripe from "stripe";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Debug the environment variable
console.log("=== STRIPE KEY DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("STRIPE_SECRET_KEY first 20 chars:", process.env.STRIPE_SECRET_KEY?.substring(0, 20));

// Validate the key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is not set in environment variables!");
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

// Initialize Stripe with explicit key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use latest API version
});

// Test the Stripe connection on startup
(async () => {
  try {
    await stripe.balance.retrieve();
    console.log("✅ Stripe connection successful");
  } catch (error) {
    console.error("❌ Stripe connection failed:", error.message);
  }
})();

export const createOrder = async (req, res, next) => {
  try {
    console.log("=== CREATE ORDER DEBUG START ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", req.userId);
    
    // Check if required data exists
    if (!req.userId) {
      console.log("❌ ERROR: req.userId is missing");
      return res.status(401).json({ error: "User not authenticated." });
    }

    if (!req.body.gigId) {
      console.log("❌ ERROR: gigId is missing from request body");
      return res.status(400).json({ error: "GigId is required." });
    }

    const { gigId } = req.body;
    console.log("✅ Looking for gig with ID:", gigId);
    
    // Validate gig exists
    const gig = await prisma.gig.findUnique({
      where: { id: gigId },
      include: {
        createdBy: {
          select: { id: true }
        }
      }
    });

    if (!gig) {
      console.log("❌ ERROR: Gig not found for ID:", gigId);
      return res.status(404).json({ error: "Gig not found." });
    }

    // Prevent users from buying their own gigs
    if (gig.createdBy.id === req.userId) {
      console.log("❌ ERROR: User trying to buy their own gig");
      return res.status(400).json({ error: "You cannot purchase your own gig." });
    }

    console.log("✅ Found gig:", JSON.stringify(gig, null, 2));

    // Validate price
    if (!gig.price || gig.price <= 0) {
      console.log("❌ ERROR: Invalid gig price:", gig.price);
      return res.status(400).json({ error: "Invalid gig price." });
    }

    console.log("✅ Gig price is valid:", gig.price);
    console.log("🔄 Creating payment intent with amount:", Math.round(gig.price * 100));
    
    // Create payment intent with explicit error handling
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(gig.price * 100),
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        gigId: gigId,
        userId: req.userId,
      },
    });

    console.log("✅ Created payment intent:", paymentIntent.id);

    // Create order in database
    console.log("🔄 Creating order in database...");
    
    const order = await prisma.order.create({
      data: {
        paymentIntent: paymentIntent.id,
        price: gig.price,
        buyer: { connect: { id: req.userId } },
        gig: { connect: { id: gigId } },
        isCompleted: false,
      },
    });

    console.log("✅ Created order:", JSON.stringify(order, null, 2));

    return res.status(201).json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: order.id
    });

  } catch (err) {
    console.log("=== CREATE ORDER ERROR ===");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Handle specific Stripe errors
    if (err.type && err.type.includes('Stripe')) {
      console.log("Stripe error type:", err.type);
      return res.status(400).json({ 
        error: "Payment processing error", 
        details: err.message 
      });
    }
    
    console.log("=== END ERROR DEBUG ===");
    return res.status(500).json({ 
      error: "Internal Server Error.", 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

// ... rest of your functions remain the same

export const confirmOrder = async (req, res, next) => {
  try {
    console.log("=== CONFIRM ORDER DEBUG START ===");
    console.log("User ID:", req.userId);
    console.log("Confirm order request body:", req.body);

    if (!req.body.paymentIntent) {
      return res.status(400).json({ error: "Payment intent ID is required." });
    }

    // Verify payment intent with Stripe first
    console.log("Retrieving payment intent from Stripe:", req.body.paymentIntent);
    const paymentIntent = await stripe.paymentIntents.retrieve(req.body.paymentIntent);
    console.log("Payment intent status:", paymentIntent.status);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: "Payment not completed.", 
        status: paymentIntent.status 
      });
    }

    // Find the order first to check if it exists
    console.log("Looking for order with payment intent:", req.body.paymentIntent);
    const existingOrder = await prisma.order.findUnique({
      where: { paymentIntent: req.body.paymentIntent }
    });
    
    if (!existingOrder) {
      console.log("Order not found for payment intent:", req.body.paymentIntent);
      return res.status(404).json({ error: "Order not found." });
    }
    
    console.log("Found existing order:", existingOrder);

    // Update order in database
    const updatedOrder = await prisma.order.update({
      where: { paymentIntent: req.body.paymentIntent },
      data: { isCompleted: true },
      include: {
        gig: {
          include: {
            createdBy: true,
          },
        },
        buyer: true,
      }
    });

    console.log("Order confirmed and updated:", updatedOrder);
    console.log("=== CONFIRM ORDER DEBUG END ===");

    return res.status(200).json({ 
      message: "Order confirmed successfully.",
      order: updatedOrder
    });

  } catch (err) {
    console.error("=== CONFIRM ORDER ERROR ===");
    console.error("Error confirming order:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Order not found." });
    }
    
    return res.status(500).json({ error: "Internal Server Error.", details: err.message });
  }
};

export const getBuyerOrders = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: "UserId is required." });
    }

    const orders = await prisma.order.findMany({
      where: { 
        buyerId: req.userId,
        // Include all statuses: IN_PROGRESS, PENDING_COMPLETION, COMPLETED
        status: {
          in: ['IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED']
        }
      },
      include: {
        gig: {
          include: {
            createdBy: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ orders });

  } catch (err) {
    console.error("Error fetching buyer orders:", err);
    return res.status(500).json({ error: "Internal Server Error.", details: err.message });
  }
};

export const getSellerOrders = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: "UserId is required." });
    }

    const orders = await prisma.order.findMany({
      where: {
        gig: {
          createdBy: {
            id: req.userId,
          },
        },
        // Include all statuses: IN_PROGRESS, PENDING_COMPLETION, COMPLETED
        status: {
          in: ['IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED']
        }
      },
      include: {
        gig: true,
        buyer: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ orders });

  } catch (err) {
    console.error("Error fetching seller orders:", err);
    return res.status(500).json({ error: "Internal Server Error.", details: err.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        gig: {
          include: {
            createdBy: true
          }
        },
        buyer: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Check if user has access to this order
    if (order.buyerId !== req.userId && order.gig.userId !== req.userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    return res.status(200).json(order);

  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Get gig milestones
export const getGigMilestones = async (req, res) => {
  try {
    const { orderId } = req.params;

    const milestones = await prisma.gigMilestone.findMany({
      where: { orderId: orderId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ milestones });

  } catch (error) {
    console.error("Error fetching gig milestones:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Add gig milestone
export const addGigMilestone = async (req, res) => {
  try {
    console.log("=== ADD GIG MILESTONE DEBUG START ===");
    console.log("Order ID:", req.params.orderId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { title, description } = req.body;
    const { orderId } = req.params;

    if (!title || !description || !title.trim() || !description.trim()) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        gig: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Check if user is the seller for this order
    if (order.gig.userId !== req.userId) {
      return res.status(403).json({ error: "You can only add milestones for your own orders." });
    }

    // Create milestone
    const milestone = await prisma.gigMilestone.create({
      data: {
        gigId: order.gigId,
        orderId: orderId,
        title: title.trim(),
        description: description.trim(),
        status: 'PENDING'
      }
    });

    console.log("Gig milestone created:", milestone.id);
    console.log("=== ADD GIG MILESTONE DEBUG END ===");

    return res.status(200).json({
      message: "Milestone added successfully.",
      milestone: milestone
    });

  } catch (error) {
    console.error("=== ADD GIG MILESTONE ERROR ===");
    console.error("Error adding gig milestone:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Update gig milestone status
export const updateGigMilestoneStatus = async (req, res) => {
  try {
    console.log("=== UPDATE GIG MILESTONE STATUS DEBUG START ===");
    console.log("Milestone ID:", req.params.milestoneId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { status } = req.body;
    const { milestoneId } = req.params;

    if (!status || !['PENDING', 'IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: "Valid status is required." });
    }

    // Find the milestone
    const milestone = await prisma.gigMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        order: {
          include: {
            gig: true
          }
        }
      }
    });

    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found." });
    }

    // Determine user role
    const isSeller = milestone.order.gig.userId === req.userId;
    const isBuyer = milestone.order.buyerId === req.userId;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: "You can only update milestones for your own orders." });
    }

    // Validate status transitions based on user role
    const currentStatus = milestone.status;
    const allowedTransitions = {
      'PENDING': {
        seller: ['IN_PROGRESS'],
        buyer: []
      },
      'IN_PROGRESS': {
        seller: ['PENDING_COMPLETION'],
        buyer: []
      },
      'PENDING_COMPLETION': {
        seller: [],
        buyer: ['COMPLETED', 'IN_PROGRESS']
      },
      'COMPLETED': {
        seller: [],
        buyer: []
      }
    };

    const userRole = isSeller ? 'seller' : 'buyer';
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus][userRole].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition. ${userRole} cannot change status from ${currentStatus} to ${status}.` 
      });
    }

    // Update milestone status
    const updatedMilestone = await prisma.gigMilestone.update({
      where: { id: milestoneId },
      data: { 
        status: status,
        progress: status === 'COMPLETED' ? 100 : status === 'PENDING_COMPLETION' ? 90 : status === 'IN_PROGRESS' ? 50 : 0
      }
    });

    console.log("Gig milestone status updated:", updatedMilestone.id, "to", status);
    console.log("=== UPDATE GIG MILESTONE STATUS DEBUG END ===");

    return res.status(200).json({
      message: "Milestone status updated successfully.",
      milestone: updatedMilestone
    });

  } catch (error) {
    console.error("=== UPDATE GIG MILESTONE STATUS ERROR ===");
    console.error("Error updating gig milestone status:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    console.log("=== UPDATE ORDER STATUS DEBUG START ===");
    console.log("Order ID:", req.params.orderId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { status } = req.body;
    const { orderId } = req.params;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        gig: {
          include: {
            createdBy: true
          }
        },
        buyer: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Verify the user is authorized to update the status
    const isBuyer = order.buyerId === req.userId;
    const isSeller = order.gig.userId === req.userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: "You are not authorized to update this order status." });
    }

    // Define allowed status transitions
    const allowedTransitions = {
      'IN_PROGRESS': {
        seller: ['PENDING_COMPLETION'], // Seller can request completion
        buyer: [] // Buyer cannot change status during work
      },
      'PENDING_COMPLETION': {
        seller: [], // Seller cannot change status from pending
        buyer: ['COMPLETED', 'IN_PROGRESS'] // Buyer can approve or reject
      },
      'COMPLETED': {
        seller: [], // No changes after completion
        buyer: [] // No changes after completion
      }
    };

    const userRole = isBuyer ? 'buyer' : 'seller';
    const currentStatus = order.status;
    
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus][userRole].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition. ${userRole} cannot change status from ${currentStatus} to ${status}.` 
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: status
      },
      include: {
        gig: {
          include: {
            createdBy: true
          }
        },
        buyer: true
      }
    });

    console.log("Order status updated:", updatedOrder.id, "to", status);
    console.log("=== UPDATE ORDER STATUS DEBUG END ===");

    const message = status === 'PENDING_COMPLETION' 
      ? "Order completion request submitted. Waiting for buyer approval."
      : status === 'COMPLETED'
      ? "Order completion approved!"
      : status === 'IN_PROGRESS'
      ? "Order completion rejected. Work continues."
      : "Order status updated successfully.";

    return res.status(200).json({
      message,
      order: updatedOrder
    });

  } catch (error) {
    console.error("=== UPDATE ORDER STATUS ERROR ===");
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Complete order (legacy function for backward compatibility)
export const completeOrder = async (req, res) => {
  try {
    console.log("=== COMPLETE ORDER DEBUG START ===");
    console.log("Order ID:", req.params.orderId);
    console.log("User ID:", req.userId);

    const { orderId } = req.params;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        gig: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Check if user is the seller for this order
    if (order.gig.userId !== req.userId) {
      return res.status(403).json({ error: "You can only complete your own orders." });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'PENDING_COMPLETION', // Request completion approval
        isCompleted: false 
      }
    });

    console.log("Order completion requested:", updatedOrder.id);
    console.log("=== COMPLETE ORDER DEBUG END ===");

    return res.status(200).json({
      message: "Order completion request submitted. Waiting for buyer approval.",
      order: updatedOrder
    });

  } catch (error) {
    console.error("=== COMPLETE ORDER ERROR ===");
    console.error("Error completing order:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};


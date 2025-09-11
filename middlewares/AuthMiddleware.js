import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please login or signup to access this feature",
      action: "login_required",
      code: "AUTH_REQUIRED"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({
        error: "Invalid authentication",
        message: "Your session has expired. Please login again",
        action: "login_required",
        code: "INVALID_TOKEN"
      });
    }
    req.userId = payload?.userId;
    
    // Fetch user details including mediator status
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { isMediator: true }
      });
      req.userIsMediator = user?.isMediator || false;
    } catch (error) {
      console.error("Error fetching user mediator status:", error);
      req.userIsMediator = false;
    }
    
    next();
  });
};

// Optional authentication middleware - doesn't block requests but provides user info if available
export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    // No token provided - continue without user info
    req.userId = null;
    req.userIsMediator = false;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      // Invalid token - continue without user info
      req.userId = null;
      req.userIsMediator = false;
      return next();
    }
    
    req.userId = payload?.userId;
    
    // Fetch user details including mediator status
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { isMediator: true }
      });
      req.userIsMediator = user?.isMediator || false;
    } catch (error) {
      console.error("Error fetching user mediator status:", error);
      req.userIsMediator = false;
    }
    
    next();
  });
};

// Middleware to check if user needs to be authenticated for specific actions
export const requireAuthForAction = (action) => {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: `Please login or signup to ${action}`,
        action: "login_required",
        code: "AUTH_REQUIRED",
        requiredAction: action
      });
    }
    next();
  };
};

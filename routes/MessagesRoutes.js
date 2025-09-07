import { Router } from "express";
import {
  addMessage,
  getMessages,
  getUnreadMessages,
  markAsRead,
  addJobMessage,
} from "../controllers/MessagesController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

export const messageRoutes = Router();

// Job messaging routes (more specific first)
messageRoutes.post("/send-job-message", verifyToken, addJobMessage);
messageRoutes.get("/get-job-messages", verifyToken, getMessages);

// Gig messaging routes  
messageRoutes.post("/send-message/:orderId", verifyToken, addMessage);
messageRoutes.get("/get-messages/:orderId", verifyToken, getMessages);

// Generic routes for backward compatibility
messageRoutes.post("/send-message", verifyToken, addJobMessage);
messageRoutes.get("/get-messages", verifyToken, getMessages);
messageRoutes.get("/unread-messages", verifyToken, getUnreadMessages);
messageRoutes.put("/mark-as-read/:messageId", verifyToken, markAsRead);

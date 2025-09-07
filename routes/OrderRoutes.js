import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  confirmOrder,
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderById,
  getGigMilestones,
  addGigMilestone,
  updateGigMilestoneStatus,
  updateOrderStatus,
  completeOrder,
} from "../controllers/OrderController.js";

export const orderRoutes = Router();

orderRoutes.post("/create", verifyToken, createOrder);
orderRoutes.post("/confirm", verifyToken, confirmOrder);
orderRoutes.put("/success", verifyToken, confirmOrder);
orderRoutes.get("/get-buyer-orders", verifyToken, getBuyerOrders);
orderRoutes.get("/get-seller-orders", verifyToken, getSellerOrders);
orderRoutes.get("/get/:orderId", verifyToken, getOrderById);
orderRoutes.get("/:orderId/milestones", verifyToken, getGigMilestones);
orderRoutes.post("/:orderId/milestones", verifyToken, addGigMilestone);
orderRoutes.put("/milestones/:milestoneId", verifyToken, updateGigMilestoneStatus);
orderRoutes.put("/status/:orderId", verifyToken, updateOrderStatus);
orderRoutes.put("/complete/:orderId", verifyToken, completeOrder);

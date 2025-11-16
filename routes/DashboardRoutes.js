import { Router } from "express";

import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { getSellerData, getBuyerData, getDashboardData } from "../controllers/DashboardController.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/seller", verifyToken, getSellerData);
dashboardRoutes.get("/buyer", verifyToken, getBuyerData);
dashboardRoutes.get("/", verifyToken, getDashboardData);

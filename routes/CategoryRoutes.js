import { Router } from "express";
import { 
  getJobCategories, 
  getGigCategories, 
  getAllCategories 
} from "../controllers/CategoryController.js";

export const categoryRoutes = Router();

// Public routes - no auth required
categoryRoutes.get("/jobs", getJobCategories);
categoryRoutes.get("/gigs", getGigCategories);
categoryRoutes.get("/all", getAllCategories);

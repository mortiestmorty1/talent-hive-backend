import {
  addGig,
  getAllUserGigs,
  getAllGigs,
  getGigById,
  searchGigs,
  updateGig,
  addReview,
  checkGigOrder,
} from "../controllers/GigController.js";
import { verifyToken, optionalAuth } from "../middlewares/AuthMiddleware.js";
import { Router } from "express";
import multer from "multer";

export const gigRoutes = Router();

const upload = multer({ dest: "uploads/" });

gigRoutes.post("/add", verifyToken, upload.array("images"), addGig);
gigRoutes.get("/all", optionalAuth, getAllGigs); // Public route with optional auth - gets all gigs without filters
gigRoutes.get("/", verifyToken, getAllUserGigs);
gigRoutes.get("/get/:gigId", optionalAuth, getGigById); // Public route with optional auth
gigRoutes.put("/edit/:gigId", verifyToken, upload.array("images"), updateGig);
gigRoutes.get("/search", optionalAuth, searchGigs); // Public route with optional auth
gigRoutes.get("/check-gig-order/:gigId", verifyToken, checkGigOrder);
gigRoutes.post("/review/:gigId", verifyToken, addReview);

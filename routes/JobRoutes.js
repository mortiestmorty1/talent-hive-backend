import { Router } from "express";
import { verifyToken, optionalAuth, requireAuthForAction } from "../middlewares/AuthMiddleware.js";
import { 
  createJob, 
  applyToJob, 
  getJobTopMatches, 
  getJobById, 
  listClientJobs, 
  browseAllJobs, 
  getAllJobs,
  searchJobs,
  getJobApplications,
  updateApplicationStatus,
  getClientJobOrders,
  getFreelancerJobOrders,
  completeJob,
  addJobReview,
  getFreelancerCompletedJobs,
  createJobPayment,
  confirmJobPayment,
  updateJobStatus,
  updateJobProgress,
  getJobMilestones,
  addJobMilestone,
  updateMilestoneStatus
} from "../controllers/JobController.js";

export const jobRoutes = Router();

// Static routes first (more specific)
jobRoutes.post("/create", verifyToken, createJob);
jobRoutes.post("/apply", verifyToken, applyToJob);
jobRoutes.get("/all", optionalAuth, getAllJobs); // Public route with optional auth - gets all jobs without filters
jobRoutes.get("/browse", optionalAuth, browseAllJobs); // Public route with optional auth
jobRoutes.get("/search", optionalAuth, searchJobs); // Public route with optional auth
jobRoutes.get("/client", verifyToken, listClientJobs);
jobRoutes.get("/orders/client", verifyToken, getClientJobOrders);
jobRoutes.get("/orders/freelancer", verifyToken, getFreelancerJobOrders);
jobRoutes.get("/completed/freelancer", verifyToken, getFreelancerCompletedJobs);
jobRoutes.post("/payment/create", verifyToken, createJobPayment);
jobRoutes.post("/payment/confirm", verifyToken, confirmJobPayment);
jobRoutes.put("/applications/:applicationId", verifyToken, updateApplicationStatus);
jobRoutes.put("/milestones/:milestoneId", verifyToken, updateMilestoneStatus);

// GET routes with specific paths
jobRoutes.get("/get/:jobId", optionalAuth, getJobById); // Public route with optional auth
jobRoutes.get("/matches/:jobId", verifyToken, getJobTopMatches);

// Dynamic routes last (less specific)
jobRoutes.get("/:jobId/applications", verifyToken, getJobApplications);
jobRoutes.get("/:jobId/milestones", verifyToken, getJobMilestones);
jobRoutes.post("/:jobId/milestones", verifyToken, addJobMilestone);
jobRoutes.put("/:jobId/progress", verifyToken, updateJobProgress);
jobRoutes.put("/complete/:jobId", verifyToken, completeJob);
jobRoutes.post("/review/:jobId", verifyToken, addJobReview);
jobRoutes.put("/update-status/:jobId", verifyToken, updateJobStatus);



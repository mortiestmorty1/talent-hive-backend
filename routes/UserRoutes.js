import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  getProfileExtra,
  // skills
  getSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  addSkillCertification,
  deleteSkillCertification,
  // top-level certifications
  getCertifications,
  addCertification,
  updateCertification,
  deleteCertification,
  // portfolio
  getPortfolio,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
} from "../controllers/UserController.js";

const userRoutes = Router();

const portfolioStorage = multer({ dest: "uploads/portfolio" });

// Profile extra
userRoutes.get("/profile/extra", verifyToken, getProfileExtra);

// Skills
userRoutes.get("/skills", verifyToken, getSkills);
userRoutes.post("/skills", verifyToken, addSkill);
userRoutes.put("/skills/:index", verifyToken, updateSkill);
userRoutes.delete("/skills/:index", verifyToken, deleteSkill);
userRoutes.post("/skills/:index/certifications", verifyToken, addSkillCertification);
userRoutes.delete("/skills/:sIndex/certifications/:cIndex", verifyToken, deleteSkillCertification);

// Top-level Certifications
userRoutes.get("/certifications", verifyToken, getCertifications);
userRoutes.post("/certifications", verifyToken, addCertification);
userRoutes.put("/certifications/:index", verifyToken, updateCertification);
userRoutes.delete("/certifications/:index", verifyToken, deleteCertification);

// Portfolio
userRoutes.get("/portfolio", verifyToken, getPortfolio);
userRoutes.post("/portfolio", verifyToken, portfolioStorage.array("images", 10), addPortfolioItem);
userRoutes.put("/portfolio/:index", verifyToken, portfolioStorage.array("images", 10), updatePortfolioItem);
userRoutes.delete("/portfolio/:index", verifyToken, deletePortfolioItem);

export default userRoutes;



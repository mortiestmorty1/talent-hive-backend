import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  openDispute,
  uploadEvidence,
  assignMediator,
  updateStatus,
  resolveDispute,
  postDisputeMessage,
  getDispute,
  listMyDisputes,
  listAllDisputesForMediators,
} from "../controllers/DisputeController.js";

const disputeRoutes = Router();
const upload = multer({ dest: "uploads/disputes" });

// middleware to mark mediator role on req
disputeRoutes.use((req, _res, next) => {
  // best-effort role flag from token claims previously set by verifyToken middleware
  // we will fetch on demand in controllers if needed
  req.userIsMediator = false;
  next();
});

disputeRoutes.post("/open", verifyToken, openDispute);
disputeRoutes.get("/mine", verifyToken, listMyDisputes);
disputeRoutes.get("/all-for-mediators", verifyToken, listAllDisputesForMediators);
disputeRoutes.get("/get/:disputeId", verifyToken, getDispute);
disputeRoutes.post("/evidence/:disputeId", verifyToken, upload.array("evidence", 10), uploadEvidence);
disputeRoutes.post("/assign/:disputeId", verifyToken, assignMediator);
disputeRoutes.put("/status/:disputeId", verifyToken, updateStatus);
disputeRoutes.put("/resolve/:disputeId", verifyToken, resolveDispute);
disputeRoutes.post("/message/:disputeId", verifyToken, postDisputeMessage);

export default disputeRoutes;



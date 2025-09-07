import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("You are not authenticated");

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) return res.status(403).send("Invalid token");
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

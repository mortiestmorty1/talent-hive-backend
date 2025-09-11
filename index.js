import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/AuthRoutes.js";
import userRoutes from "./routes/UserRoutes.js";
import prisma from "./prisma/client.js";
import { gigRoutes } from "./routes/GigRoutes.js";
import { orderRoutes } from "./routes/OrderRoutes.js";
import { dashboardRoutes } from "./routes/DashboardRoutes.js";
import { jobRoutes } from "./routes/JobRoutes.js";
import { messageRoutes } from "./routes/MessagesRoutes.js";
import disputeRoutes from "./routes/DisputeRoutes.js";

dotenv.config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const app = express();
const port = process.env.PORT || 4003;




app.use(
  cors({
    origin: [process.env.PUBLIC_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// Prisma connection to MongoDB
prisma
  .$connect()
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Failed to connect to MongoDB", error));

app.get("/", (req, res) => {
  res.send(" 🚀 TalentHive API Playground!🤖 ");
});

app.get("/ping", (req, res) => {
  res.send("pong 🏓");
});

app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads", express.static("uploads"));
app.use("/uploads/disputes", express.static("uploads/disputes"));
app.use("/uploads/portfolio", express.static("uploads/portfolio"));

// Serve default placeholder images from client public folder
app.use("/default-images", express.static("../client/public"));

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/jobs", jobRoutes);

app.listen(port, () => {
  console.log(`Server is listening at url: http://localhost:${port}`);
});


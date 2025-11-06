import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import assignmentRoutes from "./routes/assignments.js";
import submissionRoutes from "./routes/submissions.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*", credentials: true }));

// Health should respond even if DB isn't ready
app.get("/api/health", (_req, res) => res.json({ ok: true, db: global.__db_ok || false }));

// Connect to DB without blocking server start
connectDB()
  .then(() => { global.__db_ok = true; console.log("Mongo connected"); })
  .catch((e) => { global.__db_ok = false; console.error("Mongo connect error:", e.message); });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/users", userRoutes);

// Start
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
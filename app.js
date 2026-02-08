const express = require("express");
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");

console.log("🚀 Starting application...");
console.log("📝 Loading writing plan reminder job...");
require("./jobs/writingPlanReminder.job");
console.log("✅ Writing plan reminder job loaded");

const authRoutes = require("./src/routes/authRoutes");
const writingRoutes = require("./src/routes/writingPlanRoutes");
const sprintRoutes = require("./src/routes/sprintRoutes");
const writingProgressRoutes = require("./src/routes/writingProgressRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const userRoutes = require("./src/routes/userRoutes");
const quoteRoutes = require("./src/routes/quoteRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:5173",
  "https://inkwell-inky-three.vercel.app",
  "https://inkwellinky.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Enable CORS globally
app.use(cors(corsOptions));

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/writingPlan", writingRoutes);
app.use("/api/sprint", sprintRoutes);
app.use("/api/progress", writingProgressRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/quote", quoteRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Unsupported file type") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`⏰ Cron jobs are now active`);
});
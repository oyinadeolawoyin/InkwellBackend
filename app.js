const express = require("express");
require("dotenv").config();
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
require("./jobs/streakbreaker.job");
const rateLimit = require("express-rate-limit");

const authRoutes        = require("./src/routes/authRoutes");
const groupSprintRoutes = require("./src/routes/groupSprintRoutes");
const projectRoutes     = require("./src/routes/projectRoutes");
const userRoutes        = require("./src/routes/userRoutes");
const emotionRoutes     = require("./src/routes/emotionRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const blogRoutes        = require("./src/routes/blogRoutes");
const snippetRoutes     = require("./src/routes/snippetroutes");
const soundscapesRoutes = require("./src/routes/soundscaperoutes");
const todolistRoutes    = require("./src/routes/todolistRoutes");
const notesRoutes       = require("./src/routes/noteRoutes");
const feedbackRoutes    = require("./src/routes/feedbackRoutes"); 
const discoveryRoutes = require("./src/routes/discoveryroutes");
const eventRoutes = require("./src/routes/eventroutes");
const leaderboardRoutes = require("./src/routes/leaderboardRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN,
  credentials: true, // needed because you use cookies for JWT
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

app.use(cookieParser());

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // max 100 requests per IP per 15 min
//   message: { error: "Too many requests, slow down." }
// });

// app.use("/api/", limiter); // applies to all your API routes
app.use("/api/auth",          authRoutes);
app.use("/api/sprint",        groupSprintRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/emotions",       emotionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/blog",          blogRoutes);
app.use("/api/snippets",      snippetRoutes);
app.use("/api/soundscapes",   soundscapesRoutes);
app.use("/api/todos",         todolistRoutes);
app.use("/api/notes",         notesRoutes);
app.use("/api/feedback",      feedbackRoutes); 
app.use("/api/discovery", discoveryRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/leaderboard", leaderboardRoutes)

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Unsupported file type") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
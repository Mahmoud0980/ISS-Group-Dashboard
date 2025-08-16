require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Routes
const courseRoutes = require("./routes/courses");
app.use("/api/courses", courseRoutes);

const newsRoutes = require("./routes/news");
app.use("/api/news", newsRoutes);
// Default route
app.get("/", (req, res) => {
  res.send("🌍 Backend is running...");
});

const projectRoutes = require("./routes/projects");
app.use("/api/projects", projectRoutes);

const vacanciesRoutes = require("./routes/vacancies");
app.use("/api/vacancies", vacanciesRoutes);

const statsRoutes = require("./routes/stats");
app.use("/api/stats", statsRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

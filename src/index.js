const express = require("express");
const app = express();
const { createServer } = require("http");
const httpServer = createServer(app);
const bodyParser = require("body-parser");
const cors = require("cors");
const database = require("./config/database");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const faceRoutes = require("./routes/faceRoutes");
require("dotenv").config();

// Connect to database
database.connect();

const port = process.env.PORT || 3000;

// Express Config
app.use(express.json({ limit: "50mb" })); // Increased limit for face images
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// CORS config
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/face", faceRoutes);

// Basic route
app.get("/", (req, res) => {
  return res.json({ message: "ABC hello" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

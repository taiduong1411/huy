const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const { authMiddleware } = require("../middleware/auth");

// Route để nhận diện khuôn mặt và điểm danh
router.post("/", attendanceController.markAttendance);

// Routes có bảo vệ bởi authentication
router.get("/", authMiddleware, attendanceController.getAllAttendances);
router.get("/:userId", authMiddleware, attendanceController.getUserAttendances);

module.exports = router;

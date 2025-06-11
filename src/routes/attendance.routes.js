const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const { authMiddleware } = require("../middleware/auth");

// Tất cả routes yêu cầu authentication
router.use(authMiddleware);

// Route chấm công
router.post("/", attendanceController.markAttendance);

// Route xem lịch sử chấm công
router.get("/user/:userId", attendanceController.getUserAttendance);

// Route kiểm tra trạng thái chấm công hiện tại
router.get("/status", attendanceController.getCurrentStatus);

module.exports = router;

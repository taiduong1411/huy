const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  checkIn,
  checkOut,
  checkFaceRegistration,
  getTodayAttendance,
  getAttendanceHistory,
  getDepartmentAttendance,
  getAttendanceStats,
} = require("../controllers/attendanceController");

// Employee routes
router.post("/check-in", auth, checkIn);
router.post("/check-out", auth, checkOut);
router.get("/face-registration", auth, checkFaceRegistration);
router.get("/today", auth, getTodayAttendance);
router.get("/history", auth, getAttendanceHistory);
router.get("/stats", auth, getAttendanceStats);

// Admin routes
router.get("/department", auth, isAdmin, getDepartmentAttendance);

module.exports = router;

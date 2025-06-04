const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authMiddleware, isAdmin } = require("../middleware/auth");

// Tất cả routes đều yêu cầu authentication và admin role
router.use(authMiddleware, isAdmin);

// User management routes
router.get("/users", adminController.getAllUsers);
router.get("/users/:userId", adminController.getUserById);
router.put("/users/:userId", adminController.updateUser);
router.delete("/users/:userId", adminController.deleteUser);

// Attendance management routes
router.get("/attendance", adminController.getAllAttendance);
router.get("/attendance/stats", adminController.getAttendanceStats);

module.exports = router;

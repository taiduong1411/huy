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

// Shift Management Routes
router.post("/shifts", adminController.createShift);
router.put("/shifts/:shiftId", adminController.updateShift);
router.get("/shifts", adminController.getShifts);
router.get("/shifts/:shiftId", adminController.getShiftById);
router.delete("/shifts/:shiftId", adminController.deleteShift);

// Routes quản lý ca làm việc của user
router.post("/shifts/assign", adminController.assignShiftToUser);
router.post("/shifts/remove", adminController.removeShiftFromUser);
router.post("/shifts/set-default", adminController.setDefaultShift);
router.get("/:userId/shifts", adminController.getUserShifts);
router.put("/shifts/update", adminController.updateUserShifts);

module.exports = router;

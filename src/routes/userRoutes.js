const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  register,
  login,
  getProfile,
  getUsers,
  getUserById,
} = require("../controllers/userController");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", auth, getProfile);

// Admin only routes
router.get("/users", auth, isAdmin, getUsers);
router.get("/users/:id", auth, isAdmin, getUserById);

module.exports = router;

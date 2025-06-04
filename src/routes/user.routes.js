const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
} = require("../controllers/user.controller");
const { authMiddleware, isAdmin } = require("../middleware/auth");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/", authMiddleware, isAdmin, getUsers);

module.exports = router;

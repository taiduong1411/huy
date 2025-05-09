const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  registerFace,
  verifyFace,
  getFaceAngles,
  deleteFace,
} = require("../controllers/faceController");

// Protected routes
router.post("/register", auth, registerFace);
router.post("/verify", auth, verifyFace);
router.get("/angles", auth, getFaceAngles);
router.delete("/delete", auth, deleteFace);

// Admin routes
router.post("/verify/:userId", auth, isAdmin, verifyFace);

module.exports = router;

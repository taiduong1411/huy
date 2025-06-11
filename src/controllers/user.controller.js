const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const userController = {
  registerUser: async (req, res) => {
    try {
      const { userId, name, email, password, phone } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({
        $or: [{ email }, { userId }, { phone }],
      });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create user
      const user = await User.create({
        userId,
        name,
        email,
        password,
        phone,
      });

      if (user) {
        res.status(201).json({
          success: true,
          data: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: generateToken(user.userId),
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check for user email
      const user = await User.findOne({ email });

      if (user && (await user.comparePassword(password))) {
        res.json({
          success: true,
          data: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: generateToken(user.userId),
          },
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.find({}).select("-password");
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select("-password");
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = userController;

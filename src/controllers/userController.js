const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, fullName, department, position, employeeId } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }],
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = new User({
      email,
      password,
      fullName,
      department,
      position,
      employeeId,
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        position: user.position,
        employeeId: user.employeeId,
      },
      token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Sai password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        position: user.position,
        employeeId: user.employeeId,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
  }
};

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

// Get user by ID (admin only)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  getUsers,
  getUserById,
};

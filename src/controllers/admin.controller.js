const User = require("../models/User");
const Attendance = require("../models/Attendance");

const adminController = {
  // @desc    Get all users
  // @route   GET /api/admin/users
  // @access  Private/Admin
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({ role: "user" }).select("-password");
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

  // @desc    Get user by ID
  // @route   GET /api/admin/users/:userId
  // @access  Private/Admin
  getUserById: async (req, res) => {
    try {
      const user = await User.findOne({ userId: req.params.userId }).select(
        "-password"
      );
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

  // @desc    Update user
  // @route   PUT /api/admin/users/:userId
  // @access  Private/Admin
  updateUser: async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      const user = await User.findOne({ userId: req.params.userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if email/phone is being changed and if it's already taken
      if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message: "Phone number already exists",
          });
        }
      }

      user.name = name || user.name;
      user.email = email || user.email;
      user.phone = phone || user.phone;

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: {
          userId: updatedUser.userId,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // @desc    Delete user
  // @route   DELETE /api/admin/users/:userId
  // @access  Private/Admin
  deleteUser: async (req, res) => {
    try {
      const user = await User.findOne({ userId: req.params.userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await user.deleteOne();
      // Optionally, also delete all attendance records for this user
      await Attendance.deleteMany({ userId: req.params.userId });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // @desc    Get all attendance records
  // @route   GET /api/admin/attendance
  // @access  Private/Admin
  getAllAttendance: async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      let query = {};

      if (userId) {
        query.userId = userId;
      }

      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const attendance = await Attendance.find(query).sort({ timestamp: -1 });

      res.json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // @desc    Get attendance statistics
  // @route   GET /api/admin/attendance/stats
  // @access  Private/Admin
  getAttendanceStats: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let query = {};

      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const stats = await Attendance.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$userId",
            totalAttendance: { $sum: 1 },
            checkIns: {
              $sum: { $cond: [{ $eq: ["$type", "check_in"] }, 1, 0] },
            },
            checkOuts: {
              $sum: { $cond: [{ $eq: ["$type", "check_out"] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "userId",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            userId: "$_id",
            name: "$user.name",
            totalAttendance: 1,
            checkIns: 1,
            checkOuts: 1,
          },
        },
      ]);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = adminController;

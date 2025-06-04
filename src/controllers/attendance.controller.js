const Attendance = require("../models/Attendance");
const User = require("../models/User");

exports.markAttendance = async (req, res) => {
  try {
    const { userId, status } = req.body;

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra xem đã có bản ghi attendance trong ngày chưa
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      userId,
      timestamp: {
        $gte: today,
        $lt: tomorrow,
      },
    }).sort({ timestamp: -1 });

    // Xác định loại điểm danh (check-in hoặc check-out)
    let type = "check_in";
    if (existingAttendance && existingAttendance.type === "check_in") {
      type = "check_out";
    }

    // Create new attendance record
    const attendance = new Attendance({
      userId,
      type,
      status,
      timestamp: new Date(),
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllAttendances = async (req, res) => {
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

    const attendances = await Attendance.find(query).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserAttendances = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendances = await Attendance.find(query).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const Attendance = require("../models/Attendance");
const Shift = require("../models/Shift");
const User = require("../models/User");

exports.markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentTime = new Date();
    const timeStr = `${currentTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${currentTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // Kiểm tra user tồn tại
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Tự động xác định ca làm việc hiện tại
    const currentShift = await user.getCurrentShift();
    if (!currentShift) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy ca làm việc phù hợp cho thời điểm hiện tại",
      });
    }

    // Lấy ngày hiện tại (reset về 00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Kiểm tra attendance hiện tại của user
    const existingAttendance = await Attendance.findOne({
      userId,
      shiftName: currentShift.shiftName,
      date: today,
    });

    // Xác định hành động (check-in hay check-out) và validate
    if (!existingAttendance) {
      // Chưa có record nào trong ngày -> CHECK-IN
      if (!currentShift.isValidCheckInTime(timeStr)) {
        return res.status(400).json({
          success: false,
          message: `Thời gian check-in không hợp lệ. Thời gian cho phép: ${currentShift.shiftStart} ± ${currentShift.toleranceMinutes} phút`,
        });
      }

      const newAttendance = await Attendance.create({
        userId,
        shiftName: currentShift.shiftName,
        date: today,
        checkIn: {
          time: timeStr,
          timestamp: currentTime,
          status: currentShift.isValidCheckInTime(timeStr) ? "on_time" : "late",
        },
      });

      return res.status(201).json({
        success: true,
        data: newAttendance,
        message: "Check-in thành công",
      });
    } else if (!existingAttendance.checkOut.time) {
      // Đã có check-in nhưng chưa check-out -> Kiểm tra thời gian tối thiểu
      const checkInTime = new Date(existingAttendance.checkIn.timestamp);
      const timeDiffMinutes = (currentTime - checkInTime) / (1000 * 60);

      if (timeDiffMinutes < 1) {
        return res.status(400).json({
          success: false,
          message: `Bạn cần đợi ít nhất 1 phút sau khi check-in mới có thể check-out. Vui lòng đợi thêm ${Math.ceil(
            1 - timeDiffMinutes
          )} phút nữa.`,
        });
      }

      // Tính toán thời gian về sớm (nếu có)
      const [checkOutHour, checkOutMinute] = timeStr.split(":").map(Number);
      const [shiftEndHour, shiftEndMinute] = currentShift.shiftEnd
        .split(":")
        .map(Number);

      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
      const shiftEndMinutes = shiftEndHour * 60 + shiftEndMinute;

      const minutesEarly = shiftEndMinutes - checkOutMinutes;

      // Cho phép check-out bất kỳ lúc nào sau khi đã check-in (và sau 1 phút)
      const isEarly = minutesEarly > currentShift.toleranceMinutes;

      existingAttendance.checkOut = {
        time: timeStr,
        timestamp: currentTime,
        status: isEarly ? "early" : "on_time",
        minutesEarly: isEarly ? minutesEarly : 0,
      };

      const updatedAttendance = await existingAttendance.save();

      const message = isEarly
        ? `Check-out thành công. Bạn đã về sớm ${minutesEarly} phút so với giờ kết thúc ca`
        : "Check-out thành công";

      return res.json({
        success: true,
        data: updatedAttendance,
        message: message,
      });
    } else {
      // Đã có cả check-in và check-out
      return res.status(400).json({
        success: false,
        message: "Bạn đã hoàn thành chấm công cho ngày hôm nay",
      });
    }
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

exports.getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, shiftId } = req.query;

    // Validate user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    let query = { userId };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Add shift filter if provided
    if (shiftId) {
      query.shiftId = shiftId;
    }

    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .populate("shiftId", "shiftName shiftStart shiftEnd");

    res.json({
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

exports.getCurrentStatus = async (req, res) => {
  try {
    const { userId, shiftId } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId,
      shiftId,
      date: today,
    }).populate("shiftId", "shiftName shiftStart shiftEnd");

    res.json({
      success: true,
      data: {
        hasCheckedIn: !!attendance?.checkIn.time,
        hasCheckedOut: !!attendance?.checkOut.time,
        attendance: attendance || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Shift = require("../models/Shift");

const adminController = {
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
  createShift: async (req, res) => {
    try {
      const { shiftName, shiftStart, shiftEnd, toleranceMinutes, description } =
        req.body;

      // Kiểm tra ca làm việc đã tồn tại
      const existingShift = await Shift.findOne({ shiftName });
      if (existingShift) {
        return res.status(400).json({
          success: false,
          message: "Tên ca làm việc đã tồn tại",
        });
      }

      // Validate thời gian
      const startTime = shiftStart.split(":").map(Number);
      const endTime = shiftEnd.split(":").map(Number);
      const startMinutes = startTime[0] * 60 + startTime[1];
      const endMinutes = endTime[0] * 60 + endTime[1];

      // Kiểm tra thời gian hợp lệ (nếu không qua ngày mới)
      if (
        endMinutes < startMinutes &&
        endMinutes + 24 * 60 - startMinutes > 24 * 60
      ) {
        return res.status(400).json({
          success: false,
          message: "Thời gian ca làm việc không hợp lệ",
        });
      }

      const shift = new Shift({
        shiftName,
        shiftStart,
        shiftEnd,
        toleranceMinutes: toleranceMinutes || 15,
        description: description || "",
      });

      await shift.save();

      res.status(201).json({
        success: true,
        data: shift,
        message: "Tạo ca làm việc thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  updateShift: async (req, res) => {
    try {
      const { shiftId } = req.params;
      const {
        shiftName,
        shiftStart,
        shiftEnd,
        toleranceMinutes,
        description,
        isActive,
      } = req.body;

      const shift = await Shift.findById(shiftId);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy ca làm việc",
        });
      }

      // Kiểm tra tên ca mới có bị trùng không (nếu có thay đổi tên)
      if (shiftName && shiftName !== shift.shiftName) {
        const existingShift = await Shift.findOne({ shiftName });
        if (existingShift) {
          return res.status(400).json({
            success: false,
            message: "Tên ca làm việc đã tồn tại",
          });
        }
      }

      // Validate thời gian nếu có cập nhật
      if (shiftStart && shiftEnd) {
        const startTime = shiftStart.split(":").map(Number);
        const endTime = shiftEnd.split(":").map(Number);
        const startMinutes = startTime[0] * 60 + startTime[1];
        const endMinutes = endTime[0] * 60 + endTime[1];

        if (
          endMinutes < startMinutes &&
          endMinutes + 24 * 60 - startMinutes > 24 * 60
        ) {
          return res.status(400).json({
            success: false,
            message: "Thời gian ca làm việc không hợp lệ",
          });
        }
      }

      // Cập nhật thông tin
      if (shiftName) shift.shiftName = shiftName;
      if (shiftStart) shift.shiftStart = shiftStart;
      if (shiftEnd) shift.shiftEnd = shiftEnd;
      if (toleranceMinutes !== undefined)
        shift.toleranceMinutes = toleranceMinutes;
      if (description !== undefined) shift.description = description;
      if (isActive !== undefined) shift.isActive = isActive;

      await shift.save();

      res.json({
        success: true,
        data: shift,
        message: "Cập nhật ca làm việc thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  getShifts: async (req, res) => {
    try {
      const { active } = req.query;
      let query = {};

      // Nếu có query parameter active
      if (active !== undefined) {
        query.isActive = active === "true";
      }

      const shifts = await Shift.find(query).sort({ shiftStart: 1 });

      res.json({
        success: true,
        data: shifts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  getShiftById: async (req, res) => {
    try {
      const { shiftId } = req.params;

      const shift = await Shift.findById(shiftId);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy ca làm việc",
        });
      }

      res.json({
        success: true,
        data: shift,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  deleteShift: async (req, res) => {
    try {
      const { shiftId } = req.params;

      // Kiểm tra xem có attendance nào đang sử dụng shift này không
      const hasAttendances = await Attendance.exists({ shiftId });
      if (hasAttendances) {
        // Thay vì xóa, ta sẽ đánh dấu là không còn active
        await Shift.findByIdAndUpdate(shiftId, { isActive: false });
        return res.json({
          success: true,
          message: "Ca làm việc đã được đánh dấu không hoạt động",
        });
      }

      // Nếu không có attendance nào, có thể xóa an toàn
      await Shift.findByIdAndDelete(shiftId);

      res.json({
        success: true,
        message: "Xóa ca làm việc thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  assignShiftToUser: async (req, res) => {
    try {
      const { userId, shiftName, isDefault = false } = req.body;

      // Kiểm tra user tồn tại
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Kiểm tra ca làm việc tồn tại
      const shift = await Shift.findOne({ shiftName });
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy ca làm việc",
        });
      }

      // Thêm ca làm việc cho user
      await user.addShift(shiftName, isDefault);

      res.json({
        success: true,
        message: `Đã thêm ca làm việc '${shiftName}' cho người dùng ${user.name}`,
        data: user.assignedShifts,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // API để xóa ca làm việc của user
  removeShiftFromUser: async (req, res) => {
    try {
      const { userId, shiftName } = req.body;

      // Kiểm tra user tồn tại
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Xóa ca làm việc của user
      await user.removeShift(shiftName);

      res.json({
        success: true,
        message: `Đã xóa ca làm việc '${shiftName}' khỏi người dùng ${user.name}`,
        data: user.assignedShifts,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
  // API để đặt ca làm việc mặc định cho user
  setDefaultShift: async (req, res) => {
    try {
      const { userId, shiftName } = req.body;

      // Kiểm tra user tồn tại
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Đặt ca làm việc mặc định
      await user.setDefaultShift(shiftName);

      res.json({
        success: true,
        message: `Đã đặt ca làm việc '${shiftName}' làm ca mặc định cho người dùng ${user.name}`,
        data: user.assignedShifts,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
  // API để lấy danh sách ca làm việc của user
  getUserShifts: async (req, res) => {
    try {
      const { userId } = req.params;

      // Kiểm tra user tồn tại
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Lấy thông tin chi tiết của các ca làm việc
      const shiftsDetails = await Promise.all(
        user.assignedShifts.map(async (assignedShift) => {
          const shift = await Shift.findOne({
            shiftName: assignedShift.shiftName,
          });
          return {
            ...assignedShift.toObject(),
            shiftDetails: shift
              ? {
                  shiftStart: shift.shiftStart,
                  shiftEnd: shift.shiftEnd,
                  toleranceMinutes: shift.toleranceMinutes,
                  isActive: shift.isActive,
                  description: shift.description,
                }
              : null,
          };
        })
      );

      res.json({
        success: true,
        data: shiftsDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  // API để cập nhật nhiều ca làm việc cho user cùng lúc
  updateUserShifts: async (req, res) => {
    try {
      const { userId, shifts } = req.body;

      // Kiểm tra user tồn tại
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Kiểm tra tất cả ca làm việc có tồn tại không
      const shiftNames = shifts.map((s) => s.shiftName);
      const existingShifts = await Shift.find({
        shiftName: { $in: shiftNames },
      });

      if (existingShifts.length !== shiftNames.length) {
        const notFoundShifts = shiftNames.filter(
          (name) => !existingShifts.find((s) => s.shiftName === name)
        );
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy các ca làm việc: ${notFoundShifts.join(
            ", "
          )}`,
        });
      }

      // Cập nhật danh sách ca làm việc
      user.assignedShifts = shifts;
      await user.save();

      res.json({
        success: true,
        message: "Đã cập nhật danh sách ca làm việc",
        data: user.assignedShifts,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = adminController;

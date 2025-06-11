const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    shiftName: {
      type: String,
      required: true,
      ref: "Shift",
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      time: {
        type: String,
        // Format: "HH:mm"
        validate: {
          validator: function (v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: (props) =>
            `${props.value} không phải là định dạng thời gian hợp lệ! Sử dụng định dạng HH:mm`,
        },
      },
      timestamp: {
        type: Date,
        required: true,
      },
      status: {
        type: String,
        enum: ["on_time", "late", "early"],
        required: true,
      },
    },
    checkOut: {
      time: {
        type: String,
        // Format: "HH:mm"
        validate: {
          validator: function (v) {
            if (!v) return true; // Allow null for not checked out yet
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: (props) =>
            `${props.value} không phải là định dạng thời gian hợp lệ! Sử dụng định dạng HH:mm`,
        },
      },
      timestamp: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: ["on_time", "early", "late", null],
        default: null,
      },
      minutesEarly: {
        type: Number,
        default: 0,
      },
    },
    workDuration: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["present", "absent", "incomplete"],
      default: "incomplete",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index để đảm bảo mỗi user chỉ có một record cho mỗi ca làm việc trong một ngày
attendanceSchema.index({ userId: 1, shiftName: 1, date: 1 }, { unique: true });

// Tính toán thời gian làm việc khi check-out
attendanceSchema.pre("save", function (next) {
  if (this.checkIn.time && this.checkOut.time) {
    const [checkInHour, checkInMinute] = this.checkIn.time
      .split(":")
      .map(Number);
    const [checkOutHour, checkOutMinute] = this.checkOut.time
      .split(":")
      .map(Number);

    let checkInMinutes = checkInHour * 60 + checkInMinute;
    let checkOutMinutes = checkOutHour * 60 + checkOutMinute;

    // Xử lý trường hợp check-out qua ngày mới
    if (checkOutMinutes < checkInMinutes) {
      checkOutMinutes += 24 * 60;
    }

    const durationMinutes = checkOutMinutes - checkInMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    this.workDuration = `${hours}:${minutes.toString().padStart(2, "0")}`;

    // Cập nhật trạng thái chấm công
    this.status = "present";
  }
  next();
});

// Static method để tìm attendance record hiện tại của user
attendanceSchema.statics.findCurrentAttendance = async function (
  userId,
  shiftName
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.findOne({
    userId,
    shiftName,
    date: today,
  });
};

// Static method để tạo hoặc cập nhật attendance
attendanceSchema.statics.checkInOut = async function (
  userId,
  shiftName,
  time,
  timestamp,
  type = "checkIn"
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shift = await mongoose.model("Shift").findOne({ shiftName });
  if (!shift) throw new Error("Ca làm việc không tồn tại");

  let status;
  if (type === "checkIn") {
    status = shift.isValidCheckInTime(time) ? "on_time" : "late";
  } else {
    status = shift.isValidCheckOutTime(time) ? "on_time" : "early";
  }

  const update =
    type === "checkIn"
      ? {
          $setOnInsert: { date: today, userId, shiftName },
          $set: {
            "checkIn.time": time,
            "checkIn.status": status,
            "checkIn.timestamp": timestamp,
          },
        }
      : {
          $set: {
            "checkOut.time": time,
            "checkOut.status": status,
            "checkOut.timestamp": timestamp,
          },
        };

  return this.findOneAndUpdate({ userId, shiftName, date: today }, update, {
    new: true,
    upsert: type === "checkIn",
    runValidators: true,
  });
};

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const shiftSchema = new mongoose.Schema(
  {
    shiftName: {
      type: String,
      required: true,
      unique: true,
    },
    shiftStart: {
      type: String,
      required: true,
      // Format: "HH:mm" - 24 hour format
      validate: {
        validator: function (v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} không phải là định dạng thời gian hợp lệ! Sử dụng định dạng HH:mm`,
      },
    },
    shiftEnd: {
      type: String,
      required: true,
      // Format: "HH:mm" - 24 hour format
      validate: {
        validator: function (v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} không phải là định dạng thời gian hợp lệ! Sử dụng định dạng HH:mm`,
      },
    },
    toleranceMinutes: {
      type: Number,
      default: 15,
      // Số phút cho phép đến sớm hoặc muộn
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Lưu tên cũ trước khi cập nhật
shiftSchema.pre("save", function (next) {
  if (this.isModified("shiftName")) {
    this._oldShiftName = this.shiftName;
  }
  next();
});

// Cập nhật tên ca làm việc trong User model sau khi cập nhật Shift
shiftSchema.post("save", async function () {
  if (this._oldShiftName && this._oldShiftName !== this.shiftName) {
    const User = mongoose.model("User");
    await User.updateShiftName(this._oldShiftName, this.shiftName);
  }
});

// Kiểm tra xem có user nào đang sử dụng ca này không trước khi xóa
shiftSchema.pre("remove", async function (next) {
  const User = mongoose.model("User");
  const usersWithShift = await User.countDocuments({
    "assignedShifts.shiftName": this.shiftName,
  });

  if (usersWithShift > 0) {
    next(
      new Error(
        `Không thể xóa ca làm việc '${this.shiftName}' vì đang có ${usersWithShift} người dùng được phân công vào ca này!`
      )
    );
  }
  next();
});

// Tính toán thời lượng ca làm việc trước khi lưu
shiftSchema.pre("save", function (next) {
  const startTime = this.shiftStart.split(":");
  const endTime = this.shiftEnd.split(":");

  let startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
  let endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

  // Xử lý trường hợp ca làm việc qua ngày mới
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Cộng thêm 24 giờ
  }

  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  this.shiftDuration = `${hours}:${minutes.toString().padStart(2, "0")}`;
  next();
});

// Phương thức kiểm tra thời gian check-in có hợp lệ không
shiftSchema.methods.isValidCheckInTime = function (checkInTime) {
  const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);
  const [shiftStartHour, shiftStartMinute] = this.shiftStart
    .split(":")
    .map(Number);

  const checkInMinutes = checkInHour * 60 + checkInMinute;
  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;

  // Cho phép check-in sớm hoặc muộn trong khoảng toleranceMinutes
  return Math.abs(checkInMinutes - shiftStartMinutes) <= this.toleranceMinutes;
};

// Phương thức kiểm tra thời gian check-out có hợp lệ không
shiftSchema.methods.isValidCheckOutTime = function (checkOutTime) {
  const [checkOutHour, checkOutMinute] = checkOutTime.split(":").map(Number);
  const [shiftEndHour, shiftEndMinute] = this.shiftEnd.split(":").map(Number);

  const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
  const shiftEndMinutes = shiftEndHour * 60 + shiftEndMinute;

  // Cho phép check-out sớm hoặc muộn trong khoảng toleranceMinutes
  return Math.abs(checkOutMinutes - shiftEndMinutes) <= this.toleranceMinutes;
};

// Phương thức kiểm tra thời gian hiện tại có nằm trong khoảng thời gian của ca không
shiftSchema.methods.isWithinShiftTime = function (currentTime) {
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const [startHour, startMinute] = this.shiftStart.split(":").map(Number);
  const [endHour, endMinute] = this.shiftEnd.split(":").map(Number);

  const currentMinutes = currentHour * 60 + currentMinute;
  let startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;

  // Xử lý ca làm việc qua ngày mới
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    if (currentMinutes < startMinutes) {
      currentMinutes += 24 * 60;
    }
  }

  return (
    currentMinutes >= startMinutes - this.toleranceMinutes &&
    currentMinutes <= endMinutes + this.toleranceMinutes
  );
};

const Shift = mongoose.model("Shift", shiftSchema);
module.exports = Shift;

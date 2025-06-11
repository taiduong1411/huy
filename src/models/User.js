const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    assignedShifts: [
      {
        shiftName: {
          type: String,
          required: [true, "Tên ca làm việc là bắt buộc"],
          validate: {
            validator: async function (shiftName) {
              const Shift = mongoose.model("Shift");
              const shift = await Shift.findOne({ shiftName });
              return shift != null;
            },
            message: (props) =>
              `Ca làm việc '${props.value}' không tồn tại trong hệ thống!`,
          },
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Validate chỉ có một ca mặc định
userSchema.pre("save", async function (next) {
  if (this.isModified("assignedShifts")) {
    const defaultShifts = this.assignedShifts.filter(
      (shift) => shift.isDefault
    );
    if (defaultShifts.length > 1) {
      next(new Error("Chỉ được phép có một ca làm việc mặc định!"));
    }
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is assigned to a shift
userSchema.methods.isAssignedToShift = function (shiftName) {
  return this.assignedShifts.some((shift) => shift.shiftName === shiftName);
};

// Method to get user's current shift based on time
userSchema.methods.getCurrentShift = async function () {
  const currentTime = new Date();
  const timeStr = `${currentTime
    .getHours()
    .toString()
    .padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`;

  // First check default shift if exists
  const defaultShift = this.assignedShifts.find((shift) => shift.isDefault);
  if (defaultShift) {
    const shift = await mongoose.model("Shift").findOne({
      shiftName: defaultShift.shiftName,
      isActive: true,
    });
    if (shift) {
      return shift;
    }
  }

  // Then check all assigned shifts
  for (const assignedShift of this.assignedShifts) {
    const shift = await mongoose.model("Shift").findOne({
      shiftName: assignedShift.shiftName,
      isActive: true,
    });
    if (shift && shift.isWithinShiftTime(timeStr)) {
      return shift;
    }
  }

  return null;
};

// Method to add a shift to user
userSchema.methods.addShift = async function (shiftName, isDefault = false) {
  // Kiểm tra ca làm việc đã tồn tại chưa
  if (this.isAssignedToShift(shiftName)) {
    throw new Error(`Người dùng đã được phân công vào ca '${shiftName}'`);
  }

  // Nếu đặt làm ca mặc định, bỏ mặc định của ca cũ
  if (isDefault) {
    this.assignedShifts.forEach((shift) => (shift.isDefault = false));
  }

  this.assignedShifts.push({ shiftName, isDefault });
  await this.save();
};

// Method to remove a shift from user
userSchema.methods.removeShift = async function (shiftName) {
  const shiftIndex = this.assignedShifts.findIndex(
    (s) => s.shiftName === shiftName
  );
  if (shiftIndex === -1) {
    throw new Error(`Người dùng không được phân công vào ca '${shiftName}'`);
  }

  this.assignedShifts.splice(shiftIndex, 1);
  await this.save();
};

// Method to update shift name when admin changes it
userSchema.statics.updateShiftName = async function (
  oldShiftName,
  newShiftName
) {
  await this.updateMany(
    { "assignedShifts.shiftName": oldShiftName },
    { $set: { "assignedShifts.$.shiftName": newShiftName } }
  );
};

// Method to set default shift
userSchema.methods.setDefaultShift = async function (shiftName) {
  const shiftIndex = this.assignedShifts.findIndex(
    (s) => s.shiftName === shiftName
  );
  if (shiftIndex === -1) {
    throw new Error(`Người dùng không được phân công vào ca '${shiftName}'`);
  }

  // Bỏ mặc định của ca cũ
  this.assignedShifts.forEach((shift) => (shift.isDefault = false));

  // Đặt ca mới làm mặc định
  this.assignedShifts[shiftIndex].isDefault = true;
  await this.save();
};

const User = mongoose.model("User", userSchema);
module.exports = User;

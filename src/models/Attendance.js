const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      time: {
        type: Date,
        required: true,
      },
      image: {
        type: String, // URL to stored image or base64
        required: true,
      },
      faceVerified: {
        type: Boolean,
        default: false,
      },
      confidence: {
        type: Number, // Face recognition confidence percentage
        default: 0,
      },
      status: {
        type: String,
        enum: ["on_time", "late"],
        required: true,
      },
    },
    checkOut: {
      time: {
        type: Date,
      },
      image: {
        type: String, // URL to stored image or base64
      },
      faceVerified: {
        type: Boolean,
        default: false,
      },
      confidence: {
        type: Number, // Face recognition confidence percentage
        default: 0,
      },
      status: {
        type: String,
        enum: ["on_time", "early_leave", "overtime"],
      },
    },
    totalWorkingHours: {
      type: Number, // in hours
    },
    status: {
      type: String,
      enum: ["present", "absent", "half_day"],
      required: true,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;

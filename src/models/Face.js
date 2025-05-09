const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    faceData: {
      type: String, // Base64 encoded image (mặt tham chiếu)
      required: true,
    },
    faceEmbedding: {
      type: [Number], // Vector đặc trưng từ AI
      validate: {
        validator: function (v) {
          return v.length === 128; // Face embedding vectors from dlib
        },
      },
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    faceImages: [
      {
        image: {
          type: String, // Base64 encoded image of the face from different angles
          required: true,
        },
        angle: {
          type: String,
          enum: ["front", "left", "right", "up", "down"],
          default: "front",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Không cần khai báo index ở đây vì unique: true đã tự động tạo index

const Face = mongoose.model("Face", faceSchema);
module.exports = Face;

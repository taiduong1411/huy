const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Face = require("../models/Face");

// Helper function to verify face (moved from face controller)
const generateFaceEmbedding = (faceImage) => {
  // In a real implementation, this would call a face embedding model like FaceNet
  // For now, we'll return a random 128-dimensional vector
  return Array.from({ length: 128 }, () => Math.random());
};

const calculateSimilarity = (embedding1, embedding2) => {
  // Cosine similarity implementation
  const dotProduct = embedding1.reduce(
    (sum, a, idx) => sum + a * embedding2[idx],
    0
  );
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));

  return dotProduct / (magnitude1 * magnitude2);
};

// Function to verify user's face
const verifyUserFace = async (userId, faceImage) => {
  // Find user's face data
  const face = await Face.findOne({ userId });

  if (!face) {
    throw new Error("No registered face found for this user");
  }

  // Generate embedding for the provided face
  const providedFaceEmbedding = generateFaceEmbedding(faceImage);

  // Calculate similarity
  const similarity = calculateSimilarity(
    providedFaceEmbedding,
    face.faceDescriptor
  );

  // Threshold for facial recognition
  const threshold = 0.8; // 80% similarity required

  return {
    match: similarity >= threshold,
    confidence: similarity * 100,
    threshold: threshold * 100,
  };
};

// Check in with face verification
const checkIn = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verify face first
    let faceVerification = { match: false, confidence: 0 };
    try {
      faceVerification = await verifyUserFace(userId, image);

      if (!faceVerification.match) {
        return res.status(401).json({
          message: "Face verification failed. Check-in denied.",
          verification: faceVerification,
        });
      }
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: "Face verification error",
      });
    }

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    // Determine if late based on check-in time
    const checkInTime = new Date();
    const isLate = checkInTime.getHours() >= 9; // Assuming 9 AM is the start time

    const attendance = new Attendance({
      userId,
      date: today,
      checkIn: {
        time: checkInTime,
        image,
        faceVerified: true,
        confidence: faceVerification.confidence,
        status: isLate ? "late" : "on_time",
      },
      status: "present",
    });

    await attendance.save();

    res.status(201).json({
      message: "Check-in successful with face verification",
      attendance: {
        id: attendance._id,
        date: attendance.date,
        checkInTime: attendance.checkIn.time,
        status: attendance.checkIn.status,
        faceVerified: attendance.checkIn.faceVerified,
        confidence: attendance.checkIn.confidence,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking in", error: error.message });
  }
};

// Check out with face verification
const checkOut = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verify face first
    let faceVerification = { match: false, confidence: 0 };
    try {
      faceVerification = await verifyUserFace(userId, image);

      if (!faceVerification.match) {
        return res.status(401).json({
          message: "Face verification failed. Check-out denied.",
          verification: faceVerification,
        });
      }
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        error: "Face verification error",
      });
    }

    const attendance = await Attendance.findOne({
      userId,
      date: today,
    });

    if (!attendance) {
      return res
        .status(404)
        .json({ message: "No check-in record found for today" });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({ message: "Already checked out today" });
    }

    const checkOutTime = new Date();
    const isEarlyLeave = checkOutTime.getHours() < 17; // Assuming 5 PM is the end time
    const isOvertime = checkOutTime.getHours() >= 18; // Assuming 6 PM is overtime

    // Calculate working hours
    const workingHours =
      (checkOutTime - attendance.checkIn.time) / (1000 * 60 * 60);

    attendance.checkOut = {
      time: checkOutTime,
      image,
      faceVerified: true,
      confidence: faceVerification.confidence,
      status: isEarlyLeave
        ? "early_leave"
        : isOvertime
        ? "overtime"
        : "on_time",
    };
    attendance.totalWorkingHours = workingHours;

    await attendance.save();

    res.json({
      message: "Check-out successful with face verification",
      attendance: {
        id: attendance._id,
        date: attendance.date,
        checkInTime: attendance.checkIn.time,
        checkOutTime: attendance.checkOut.time,
        status: attendance.checkOut.status,
        totalWorkingHours: attendance.totalWorkingHours,
        faceVerified: attendance.checkOut.faceVerified,
        confidence: attendance.checkOut.confidence,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking out", error: error.message });
  }
};

// Check if user has registered face
const checkFaceRegistration = async (req, res) => {
  try {
    const userId = req.user._id;

    const face = await Face.findOne({ userId });

    if (!face) {
      return res.json({
        registered: false,
        message: "User has not registered face data yet",
      });
    }

    res.json({
      registered: true,
      message: "User has registered face data",
      angles: face.faceImages.map((img) => img.angle),
      lastUpdated: face.lastUpdated,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error checking face registration",
        error: error.message,
      });
  }
};

// Get today's attendance
const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId,
      date: today,
    });

    res.json(attendance || { message: "No attendance record for today" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching attendance", error: error.message });
  }
};

// Get attendance history
const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const query = { userId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(30); // Limit to last 30 records

    res.json(attendance);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching attendance history",
        error: error.message,
      });
  }
};

// Get department attendance (admin only)
const getDepartmentAttendance = async (req, res) => {
  try {
    const { department, date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const users = await User.find({ department });
    const userIds = users.map((user) => user._id);

    const attendance = await Attendance.find({
      userId: { $in: userIds },
      date: queryDate,
    }).populate("userId", "fullName employeeId department position");

    res.json(attendance);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching department attendance",
        error: error.message,
      });
  }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const startDate = new Date(
      year || new Date().getFullYear(),
      month ? month - 1 : new Date().getMonth(),
      1
    );
    const endDate = new Date(
      year || new Date().getFullYear(),
      month ? month : new Date().getMonth() + 1,
      0
    );

    const attendance = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const stats = {
      totalDays: attendance.length,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      halfDay: attendance.filter((a) => a.status === "half_day").length,
      late: attendance.filter((a) => a.checkIn.status === "late").length,
      earlyLeave: attendance.filter((a) => a.checkOut?.status === "early_leave")
        .length,
      overtime: attendance.filter((a) => a.checkOut?.status === "overtime")
        .length,
      totalWorkingHours: attendance.reduce(
        (sum, a) => sum + (a.totalWorkingHours || 0),
        0
      ),
    };

    res.json(stats);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching attendance statistics",
        error: error.message,
      });
  }
};

module.exports = {
  checkIn,
  checkOut,
  checkFaceRegistration,
  getTodayAttendance,
  getAttendanceHistory,
  getDepartmentAttendance,
  getAttendanceStats,
};

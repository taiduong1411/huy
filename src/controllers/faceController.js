const Face = require("../models/Face");
const User = require("../models/User");

/**
 * Helper function to simulate AI face embedding generation
 * In a real application, this would call an actual AI model
 */
const generateFaceEmbedding = (faceImage) => {
  // In a real implementation, this would call a face embedding model like FaceNet
  // For now, we'll return a random 128-dimensional vector
  return Array.from({ length: 128 }, () => Math.random());
};

/**
 * Helper function to calculate similarity between face embeddings
 */
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

/**
 * Register user's face
 */
const registerFace = async (req, res) => {
  try {
    const { faceImage, angle } = req.body;
    const userId = req.user._id;

    if (!faceImage) {
      return res.status(400).json({ message: "Face image is required" });
    }

    // Validate image quality (placeholder for real implementation)
    if (faceImage.length < 1000) {
      return res.status(400).json({
        message: "Image quality too low. Please provide a clearer image.",
      });
    }

    // Generate face embedding using AI
    const faceEmbedding = generateFaceEmbedding(faceImage);

    // Check if user already has face data
    let face = await Face.findOne({ userId });

    if (face) {
      // Add to existing face images collection
      face.faceImages.push({
        image: faceImage,
        angle: angle || "front",
        createdAt: new Date(),
      });

      // Update face data and descriptor
      face.faceData = faceImage;
      face.faceDescriptor = faceEmbedding;
      face.lastUpdated = new Date();

      await face.save();

      res.json({
        message: "Face updated successfully",
        angles: face.faceImages.map((img) => img.angle),
      });
    } else {
      // Create new face record
      face = new Face({
        userId,
        faceData: faceImage,
        faceDescriptor: faceEmbedding,
        faceImages: [
          {
            image: faceImage,
            angle: angle || "front",
            createdAt: new Date(),
          },
        ],
      });

      await face.save();

      res.status(201).json({
        message: "Face registered successfully",
        angles: [angle || "front"],
      });
    }
  } catch (error) {
    console.error("Error in face registration:", error);
    res
      .status(500)
      .json({ message: "Error registering face", error: error.message });
  }
};

/**
 * Verify a face against the stored face data
 */
const verifyFace = async (req, res) => {
  try {
    const { faceImage } = req.body;
    const userId = req.params.userId || req.user._id;

    if (!faceImage) {
      return res.status(400).json({ message: "Face image is required" });
    }

    // Find the user's face data
    const face = await Face.findOne({ userId });

    if (!face) {
      return res
        .status(404)
        .json({ message: "No registered face found for this user" });
    }

    // Generate embedding for the provided face
    const providedFaceEmbedding = generateFaceEmbedding(faceImage);

    // Calculate similarity
    const similarity = calculateSimilarity(
      providedFaceEmbedding,
      face.faceDescriptor
    );

    // Threshold for facial recognition (adjust based on desired sensitivity)
    const threshold = 0.8; // 80% similarity required

    if (similarity >= threshold) {
      res.json({
        match: true,
        confidence: similarity * 100,
        message: "Face verification successful",
      });
    } else {
      res.json({
        match: false,
        confidence: similarity * 100,
        message: "Face verification failed",
        threshold: threshold * 100,
      });
    }
  } catch (error) {
    console.error("Error in face verification:", error);
    res
      .status(500)
      .json({ message: "Error verifying face", error: error.message });
  }
};

/**
 * Get all face angles for a user
 */
const getFaceAngles = async (req, res) => {
  try {
    const userId = req.user._id;

    const face = await Face.findOne({ userId });

    if (!face) {
      return res.status(404).json({ message: "No registered face found" });
    }

    const angles = face.faceImages.map((img) => ({
      angle: img.angle,
      createdAt: img.createdAt,
    }));

    res.json({
      message: "Face data retrieved successfully",
      angles,
    });
  } catch (error) {
    console.error("Error fetching face data:", error);
    res
      .status(500)
      .json({ message: "Error fetching face data", error: error.message });
  }
};

/**
 * Delete face data
 */
const deleteFace = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Face.findOneAndDelete({ userId });

    if (!result) {
      return res.status(404).json({ message: "No face data found to delete" });
    }

    res.json({ message: "Face data deleted successfully" });
  } catch (error) {
    console.error("Error deleting face data:", error);
    res
      .status(500)
      .json({ message: "Error deleting face data", error: error.message });
  }
};

module.exports = {
  registerFace,
  verifyFace,
  getFaceAngles,
  deleteFace,
};

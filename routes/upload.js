const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads"); // This is mapped to a VM folder using Docker
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in /uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file
  },
});

const upload = multer({ storage });

// Image Upload Route
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  res.send({ message: "File uploaded!", filename: req.file.filename });
});

// Serve Uploaded Images
router.get("/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send({ error: "File not found" });
  }
});

module.exports = router;
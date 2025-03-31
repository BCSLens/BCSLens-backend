// const express = require('express');
// const router = express.Router();
// const AWS = require('aws-sdk');
// const multer = require('multer');
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// const s3 = new AWS.S3({
//   region: 'ap-southeast-1', 
// });

// router.post('/', upload.single('file'), async (req, res) => {  
//   try {
//     const file = req.file;
//     const params = {
//       Bucket: 'bcslens',
//       Key: file.originalname,
//       Body: file.buffer,
//       ContentType: file.mimetype,
//     };

//     const result = await s3.upload(params).promise();
//     res.json({
//       message: 'Upload success',
//       url: result.Location,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = "/uploads"; // This is mapped to a VM folder using Docker
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

module.exports = router;
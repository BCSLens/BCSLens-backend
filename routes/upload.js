const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const authenticateToken = require("../middleware/auth");
const logger = require('../config/logger');

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Upload directory created', { path: uploadDir });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      logger.warn('Invalid file type upload attempt', {
        userId: req.user?.id,
        originalName: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip
      });
      cb(new Error("Only images (jpg, png, gif) are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/",
  authenticateToken(["expert", "pet-owner"]),
  (req, res) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          logger.warn('File size limit exceeded', {
            userId: req.user?.id,
            errorCode: err.code,
            ip: req.ip
          });
          return res.status(400).json({ error: "File too large (max 5MB)" });
        }
        logger.warn('Multer upload error', {
          userId: req.user?.id,
          errorCode: err.code,
          error: err.message,
          ip: req.ip
        });
        return res.status(400).json({ error: "File upload failed" });
      } else if (err) {
        logger.error('File upload error', {
          error: err.message,
          stack: err.stack,
          userId: req.user?.id,
          ip: req.ip
        });
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        logger.warn('Upload request without file', {
          userId: req.user?.id,
          ip: req.ip
        });
        return res.status(400).json({ error: "No file uploaded" });
      }

      logger.info('File uploaded successfully', {
        userId: req.user?.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        ip: req.ip
      });
      
      res.json({ 
        message: "File uploaded successfully", 
        filename: req.file.filename 
      });
    });
  }
);

router.get(
  "/:filename",
  authenticateToken(["expert", "pet-owner"]),
  (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      
      if (!/^[a-f0-9]{32}\.(jpg|jpeg|png|gif)$/i.test(filename)) {
        logger.warn('Invalid filename format access attempt', {
          userId: req.user?.id,
          requestedFilename: req.params.filename,
          ip: req.ip
        });
        return res.status(400).json({ error: "Invalid filename format" });
      }

      const filePath = path.join(__dirname, "..", uploadDir, filename);
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);
      
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        logger.error('Path traversal attack attempt', {
          userId: req.user?.id,
          requestedFilename: req.params.filename,
          resolvedPath,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
        return res.status(403).json({ error: "Access denied" });
      }

      if (fs.existsSync(filePath)) {
        logger.info('File accessed', {
          userId: req.user?.id,
          filename,
          ip: req.ip
        });
        res.sendFile(filePath);
      } else {
        logger.warn('File not found', {
          userId: req.user?.id,
          filename,
          ip: req.ip
        });
        res.status(404).json({ error: "File not found" });
      }
    } catch (err) {
      logger.error('File serve error', {
        error: err.message,
        stack: err.stack,
        code: err.code,
        userId: req.user?.id,
        filename: req.params.filename,
        ip: req.ip
      });
      
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (err.code === "EACCES" || err.code === "EPERM") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.status(500).json({ 
        error: process.env.NODE_ENV === "production" 
          ? "Internal server error" 
          : err.message 
      });
    }
  }
);

module.exports = router;

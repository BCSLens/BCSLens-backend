const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // ⭐ ใช้ promises version
const crypto = require("crypto");
const fileType = require("file-type");
const authenticateToken = require("../middleware/auth");
const logger = require('../config/logger');

const uploadDir = "./uploads";

// สร้าง upload directory ถ้ายังไม่มี
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    logger.info('Upload directory ready', { path: uploadDir });
  } catch (err) {
    logger.error('Failed to create upload directory', { error: err.message });
  }
})();

// ⭐ ใช้ memoryStorage เพื่อตรวจสอบก่อนบันทึก
const storage = multer.memoryStorage();

// Allowed file types
const allowedExtensions = /jpeg|jpg|png|gif/;
const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extname = allowedExtensions.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedExtensions.test(file.mimetype);

    if (extname && mimetype) {
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
  limits: { 
    fileSize: 5 * 1024 * 1024,  // 5MB
    files: 1                     // จำกัด 1 ไฟล์ต่อ request
  },
});

// ⭐ ฟังก์ชันตรวจสอบ Magic Bytes (ปรับปรุงแล้ว)
async function validateFileContent(buffer, declaredMime, userId, ip) {
  try {
    // ตรวจสอบว่า buffer ไม่ว่าง
    if (!buffer || buffer.length === 0) {
      logger.warn('Empty file buffer detected', { userId, ip });
      throw new Error('File is empty');
    }

    // ตรวจสอบ magic bytes
    const detectedType = await fileType.fromBuffer(buffer);

    if (!detectedType) {
      logger.warn('Unable to detect file type from magic bytes', {
        userId,
        declaredMime,
        bufferSize: buffer.length,
        ip
      });
      throw new Error('Cannot determine file type from content');
    }

    // ตรวจสอบว่าเป็น MIME type ที่อนุญาต
    if (!allowedMimes.includes(detectedType.mime)) {
      logger.warn('Detected MIME type not allowed', {
        userId,
        detectedMime: detectedType.mime,
        declaredMime,
        ip
      });
      throw new Error('File type not allowed');
    }

    // ⭐ ตรวจสอบว่า declared MIME ตรงกับ actual content
    // (อนุญาตให้ image/jpg และ image/jpeg ใช้แทนกันได้)
    const normalizedDeclared = declaredMime.replace('image/jpg', 'image/jpeg');
    const normalizedDetected = detectedType.mime;

    if (normalizedDeclared !== normalizedDetected) {
      logger.warn('MIME type mismatch', {
        userId,
        declared: declaredMime,
        detected: detectedType.mime,
        ip
      });
      throw new Error('File content does not match declared type');
    }

    logger.info('File content validation passed', {
      userId,
      mime: detectedType.mime,
      ext: detectedType.ext,
      ip
    });

    return true;
  } catch (err) {
    // Re-throw เพื่อให้ caller จัดการ
    throw err;
  }
}

// ⭐ ฟังก์ชันบันทึกไฟล์อย่างปลอดภัย
async function saveFileSecurely(buffer, originalName, userId, ip) {
  const randomName = crypto.randomBytes(16).toString("hex");
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${randomName}${ext}`;
  const filePath = path.join(uploadDir, filename);

  try {
    // บันทึกไฟล์ด้วย async
    await fs.writeFile(filePath, buffer);

    logger.info('File saved to disk', {
      userId,
      filename,
      size: buffer.length,
      path: filePath,
      ip
    });

    return { filename, filePath };
  } catch (err) {
    logger.error('Failed to save file', {
      userId,
      error: err.message,
      stack: err.stack,
      filename,
      ip
    });
    throw new Error('Failed to save file to disk');
  }
}

// ⭐ Upload endpoint (ปรับปรุงแล้ว)
router.post(
  "/",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    upload.single("image")(req, res, async (err) => {
      // จัดการ Multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          logger.warn('File size limit exceeded', {
            userId: req.user?.id,
            errorCode: err.code,
            ip: req.ip
          });
          return res.status(400).json({ error: "File too large (max 5MB)" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          logger.warn('Too many files uploaded', {
            userId: req.user?.id,
            ip: req.ip
          });
          return res.status(400).json({ error: "Only one file allowed" });
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

      // ตรวจสอบว่ามีไฟล์หรือไม่
      if (!req.file) {
        logger.warn('Upload request without file', {
          userId: req.user?.id,
          ip: req.ip
        });
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        // ⭐ STEP 1: ตรวจสอบ Magic Bytes ก่อน (ไฟล์ยังอยู่ใน memory)
        await validateFileContent(
          req.file.buffer,
          req.file.mimetype,
          req.user?.id,
          req.ip
        );

        // ⭐ STEP 2: บันทึกไฟล์หลังจากผ่านการตรวจสอบแล้ว
        const { filename, filePath } = await saveFileSecurely(
          req.file.buffer,
          req.file.originalname,
          req.user?.id,
          req.ip
        );

        logger.info('File uploaded successfully', {
          userId: req.user?.id,
          filename: filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          ip: req.ip
        });

        res.json({
          message: "File uploaded successfully",
          filename: filename
        });
      } catch (validationErr) {
        // ไฟล์ไม่ผ่านการตรวจสอบ - ไม่ได้บันทึกลง disk เลย!
        logger.error('File validation failed', {
          userId: req.user?.id,
          error: validationErr.message,
          originalName: req.file?.originalname,
          size: req.file?.size,
          mimetype: req.file?.mimetype,
          ip: req.ip
        });
        return res.status(400).json({ error: validationErr.message });
      }
    });
  }
);

// ⭐ Serve file endpoint (ปรับปรุงแล้ว)
router.get(
  "/:filename",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    try {
      const filename = path.basename(req.params.filename);

      // ตรวจสอบ null bytes และ special characters
      if (filename.includes('\0') || filename.includes('..')) {
        logger.error('Malicious filename detected', {
          userId: req.user?.id,
          requestedFilename: req.params.filename,
          ip: req.ip
        });
        return res.status(400).json({ error: "Invalid filename" });
      }

      // ตรวจสอบรูปแบบชื่อไฟล์
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

      // ป้องกัน path traversal
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

      // ตรวจสอบว่าไฟล์มีอยู่จริง (ใช้ async)
      try {
        await fs.access(filePath);
        logger.info('File accessed', {
          userId: req.user?.id,
          filename,
          ip: req.ip
        });
        res.sendFile(resolvedPath);
      } catch (accessErr) {
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

const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const s3 = new AWS.S3({
  region: 'ap-southeast-1', 
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const params = {
      Bucket: 'bcslens',
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', 
    };

    const result = await s3.upload(params).promise();
    res.json({
      message: 'Upload success',
      url: result.Location,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

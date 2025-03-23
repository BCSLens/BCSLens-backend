// routes/user.js
const express = require('express');
const router = express.Router();

// ตัวอย่างข้อมูลผู้ใช้
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

// GET /users - ดึงข้อมูลผู้ใช้
router.get('/', (req, res) => {
  res.json(users);
});

module.exports = router;

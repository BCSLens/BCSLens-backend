const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);


// Create a new group for a user
router.post('/', async (req, res) => {
  try {
    const { group_name } = req.body;
    const user_id = req.user.id; // from JWT

    if (!group_name) {
      return res.status(400).json({ error: 'group_name is required' });
    }

    // 1. Create a new group
    const newGroup = new Group({
      group_name,
      user_id,
      pets: []
    });
    await newGroup.save();

    // 2. Update the user's pets_group array
    await User.findByIdAndUpdate(user_id, {
      $push: { pets_group: newGroup._id }
    });

    res.status(201).json({ message: 'Group created', group: newGroup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups and their pets for the authenticated user
router.get('/', async (req, res) => {
  try {
    const user_id = req.user.id; // from JWT

    const groups = await Group.find({ user_id }).populate('pets'); // populate pet references

    res.status(200).json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

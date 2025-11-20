const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Group = require("../models/Group");
const mongoose = require("mongoose");
const authenticateToken = require("../middleware/auth");
const { validate, createGroupValidator } = require("../middleware/validators");
const logger = require('../config/logger');

router.use(authenticateToken());

// ✅ Helper function
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Create a new group
router.post(
  "/",
  authenticateToken(["expert", "pet-owner"]),
  validate(createGroupValidator),
  async (req, res) => {
    try {
      const { group_name } = req.body;
      const user_id = req.user.id;

      // ✅ Validate user_id
      if (!isValidObjectId(user_id)) {
        logger.warn('Invalid user ID in create group', {
          userId: user_id,
          ip: req.ip
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // ✅ Check duplicate (Mongoose จัดการให้แล้ว แต่ชัดเจนขึ้น)
      const existing = await Group.findOne({ 
        user_id: user_id, 
        group_name: group_name 
      });
      
      if (existing) {
        logger.warn('Duplicate group name attempt', {
          userId: user_id,
          groupName: group_name,
          existingGroupId: existing._id
        });
        return res.status(400).json({ 
          error: "Group name already exists for this user" 
        });
      }

      const newGroup = new Group({
        group_name,
        user_id,
        pets: [],
      });

      await newGroup.save();

      // ✅ ตรวจสอบว่า user มีอยู่จริง
      const updatedUser = await User.findByIdAndUpdate(
        user_id,
        { $push: { pets_group: newGroup._id } },
        { new: true }
      );

      if (!updatedUser) {
        logger.error('User not found during group creation (rollback initiated)', {
          userId: user_id,
          groupId: newGroup._id,
          groupName: group_name
        });
        await Group.findByIdAndDelete(newGroup._id);
        return res.status(404).json({ error: "User not found" });
      }
      
      logger.info('Group created successfully', {
        groupId: newGroup._id,
        groupName: group_name,
        userId: user_id,
        username: updatedUser.username
      });

      res.status(201).json({
        message: "Group created successfully",
        group: newGroup,
      });
    } catch (err) {
      logger.error('Create group error', {
        error: err.message,
        stack: err.stack,
        userId: req.user?.id,
        groupName: req.body.group_name
      });
      
      if (err.name === "ValidationError") {
        return res.status(400).json({ error: "Invalid group data" });
      }
      
      res.status(500).json({ 
        error: process.env.NODE_ENV === "production" 
          ? "Internal server error" 
          : err.message 
      });
    }
  }
);

// Get all groups for authenticated user
router.get(
  "/",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    try {
      const user_id = req.user.id;

      // ✅ Validate user_id
      if (!isValidObjectId(user_id)) {
        logger.warn('Invalid user ID in get groups', {
          userId: user_id,
          ip: req.ip
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const groups = await Group.find({ user_id }).populate("pets");

      logger.info('Groups retrieved', {
        userId: user_id,
        groupCount: groups.length,
        totalPets: groups.reduce((sum, g) => sum + g.pets.length, 0)
      });

      res.status(200).json({ groups });
    } catch (err) {
      logger.error('Get groups error', {
        error: err.message,
        stack: err.stack,
        userId: req.user?.id
      });
      
      if (err.name === "CastError") {
        return res.status(400).json({ error: "Invalid user ID format" });
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

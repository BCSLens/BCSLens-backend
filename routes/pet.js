const express = require("express");
const router = express.Router();
const Pet = require("../models/Pet");
const Group = require("../models/Group");
const mongoose = require("mongoose");
const authenticateToken = require("../middleware/auth");
const logger = require("../config/logger");
const {
  validate,
  createPetValidation,
  addRecordValidator,
} = require("../middleware/validators");

router.use(authenticateToken());

// ✅ Helper function สำหรับตรวจสอบ ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Create a new pet
router.post(
  "/",
  authenticateToken(["expert", "pet-owner"]),
  validate(createPetValidation),
  async (req, res) => {
    try {
      const {
        name,
        breed,
        age_years,
        age_months,
        gender,
        spay_neuter_status,
        group_id,
        species,
      } = req.body;

      const user_id = req.user.id;

      if (!isValidObjectId(user_id)) {
        logger.warn("Invalid user ID in create pet", {
          userId: user_id,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      if (!isValidObjectId(group_id)) {
        logger.warn("Invalid group ID in create pet", {
          userId: user_id,
          groupId: group_id,
        });
        return res.status(400).json({ error: "Invalid group ID" });
      }

      // ✅ ตรวจสอบว่า group เป็นของ user นี้
      const group = await Group.findOne({ _id: group_id, user_id });
      if (!group) {
        logger.warn("Unauthorized access to group", {
          userId: user_id,
          groupId: group_id,
          action: "create_pet",
        });
        return res
          .status(404)
          .json({ error: "Group not found or unauthorized" });
      }

      const newPet = new Pet({
        name,
        breed,
        age_years,
        age_months,
        gender,
        spay_neuter_status,
        records: [],
        group_id,
        species,
        user_id,
      });

      await newPet.save();

      await Group.findByIdAndUpdate(
        group_id,
        { $push: { pets: newPet._id } },
        { new: true }
      );

      logger.info("Pet created successfully", {
        petId: newPet._id,
        petName: name,
        species,
        userId: user_id,
        groupId: group_id,
      });

      res.status(201).json({
        message: "Pet created and added to group",
        pet: newPet,
      });
    } catch (err) {
      logger.error("Create pet error", {
        error: err.message,
        stack: err.stack,
        userId: req.user?.id,
        petData: {
          name: req.body.name,
          species: req.body.species,
          groupId: req.body.group_id,
        },
      });

      if (err.name === "ValidationError") {
        return res.status(400).json({ error: "Invalid pet data" });
      }

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

// Add record to pet
router.post(
  "/:petId/records",
  authenticateToken(["expert", "pet-owner"]),
  validate(addRecordValidator),
  async (req, res) => {
    try {
      const { petId } = req.params;
      const user_id = req.user.id;

      // ✅ Validate IDs
      if (!isValidObjectId(petId)) {
        logger.warn("Invalid pet ID in add record", {
          petId,
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid pet ID" });
      }

      if (!isValidObjectId(user_id)) {
        logger.warn("Invalid user ID in add record", {
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const pet = await Pet.findById(petId);
      if (!pet) {
        logger.warn("Pet not found when adding record", {
          petId,
          userId: user_id,
        });
        return res.status(404).json({ error: "Pet not found" });
      }

      if (pet.user_id.toString() !== user_id) {
        logger.warn("Unauthorized attempt to add record", {
          petId,
          petOwnerId: pet.user_id,
          attemptUserId: user_id,
          ip: req.ip,
        });
        return res.status(403).json({ error: "Unauthorized" });
      }

      pet.records.push(req.body);
      await pet.save();

      logger.info("Record added to pet", {
        petId,
        petName: pet.name,
        recordType: req.body.type,
        recordDate: req.body.date,
        userId: user_id,
      });

      res.status(201).json({
        message: "Record added successfully",
        record: req.body,
      });
    } catch (err) {
      logger.error("Add record error", {
        error: err.message,
        stack: err.stack,
        petId: req.params.petId,
        userId: req.user?.id,
        recordData: req.body,
      });

      if (err.name === "CastError") {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

// Get pet info
router.get(
  "/:petId",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    try {
      const { petId } = req.params;
      const user_id = req.user.id;

      // ✅ Validate IDs
      if (!isValidObjectId(petId)) {
        logger.warn("Invalid pet ID in get pet", {
          petId,
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid pet ID" });
      }

      if (!isValidObjectId(user_id)) {
        logger.warn("Invalid user ID in get pet", {
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const pet = await Pet.findById(petId);
      if (!pet) {
        logger.warn("Pet not found", {
          petId,
          userId: user_id,
        });
        return res.status(404).json({ error: "Pet not found" });
      }

      if (pet.user_id.toString() !== user_id) {
        logger.warn("Unauthorized access to pet data", {
          petId,
          petOwnerId: pet.user_id,
          attemptUserId: user_id,
          ip: req.ip,
        });
        return res.status(403).json({ error: "Unauthorized" });
      }

      logger.info("Pet data accessed", {
        petId,
        petName: pet.name,
        userId: user_id,
      });

      res.json({ pet });
    } catch (err) {
      logger.error("Get pet error", {
        error: err.message,
        stack: err.stack,
        petId: req.params.petId,
        userId: req.user?.id,
      });

      if (err.name === "CastError") {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

// Get latest record
router.get(
  "/:petId/records/latest",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    try {
      const { petId } = req.params;
      const user_id = req.user.id;

      // ✅ Validate IDs
      if (!isValidObjectId(petId)) {
        logger.warn("Invalid pet ID in get latest record", {
          petId,
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid pet ID" });
      }

      if (!isValidObjectId(user_id)) {
        logger.warn("Invalid user ID in get latest record", {
          userId: user_id,
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const pet = await Pet.findById(petId);
      if (!pet) {
        logger.warn("Pet not found when getting latest record", {
          petId,
          userId: user_id,
        });
        return res.status(404).json({ error: "Pet not found" });
      }

      if (pet.user_id.toString() !== user_id) {
        logger.warn("Unauthorized access to pet records", {
          petId,
          petOwnerId: pet.user_id,
          attemptUserId: user_id,
          ip: req.ip,
        });
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (pet.records.length === 0) {
        logger.info("No records available for pet", {
          petId,
          userId: user_id,
        });
        return res.status(404).json({ error: "No records available" });
      }

      const latestRecord = [...pet.records].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      )[0];

      logger.info("Latest record accessed", {
        petId,
        petName: pet.name,
        recordDate: latestRecord.date,
        userId: user_id,
      });

      res.json({ record: latestRecord });
    } catch (err) {
      logger.error('Get latest record error', {
        error: err.message,
        stack: err.stack,
        petId: req.params.petId,
        userId: req.user?.id
      });

      if (err.name === "CastError") {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

module.exports = router;

const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// Create a new pet (for a specific user)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      breed,
      age_years,
      age_months,
      gender,
      spay_neuter_status,
      group_id,
      species
    } = req.body;

    const user_id = req.user.id; // from JWT

    if (!name || !breed || !age_years || !age_months || !gender || !spay_neuter_status || !group_id || !species) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Step 1: Create the pet
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
      user_id
    });

    await newPet.save();

    // Step 2: Push the pet's _id into the group's pets array
    const Group = require('../models/Group'); // make sure Group model is correct and imported
    const updatedGroup = await Group.findByIdAndUpdate(
      group_id,
      { $push: { pets: newPet._id } },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ error: 'Group not found to update with new pet' });
    }

    res.status(201).json({
      message: 'Pet created and added to group',
      pet: newPet,
      group: updatedGroup
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add a record to pet by pet id, verify user owns pet
router.post('/:petId/records', async (req, res) => {
  try {
    const { petId } = req.params;
    const user_id = req.user.id; // from token

    const {
      date,
      score,
      weight,
      front_image_url,
      back_image_url,
      left_image_url,
      right_image_url,
      top_image_url,
    } = req.body;

    if (!score || !date) {
      return res.status(400).json({ error: 'Score and date are required' });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    if (pet.user_id.toString() !== user_id) {
      return res.status(403).json({ error: 'Unauthorized: Pet does not belong to user' });
    }

    const newRecord = {
      date,
      score,
      weight,
      front_image_url,
      back_image_url,
      left_image_url,
      right_image_url,
      top_image_url,
    };

    pet.records.push(newRecord);
    await pet.save();

    res.status(201).json({ message: 'Record added', record: newRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get pet info by pet id, verify user owns pet
router.get('/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const user_id = req.user.id; // can be passed as query param

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    if (pet.user_id.toString() !== user_id) {
      return res.status(403).json({ error: 'Unauthorized: Pet does not belong to user' });
    }

    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest record of pet by pet id, verify user owns pet
router.get('/:petId/records/latest', async (req, res) => {
  try {
    const { petId } = req.params;
    const user_id = req.query.user_id;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    if (pet.user_id.toString() !== user_id) {
      return res.status(403).json({ error: 'Unauthorized: Pet does not belong to user' });
    }

    if (pet.records.length === 0) {
      return res.status(404).json({ error: 'No records found for this pet' });
    }

    const latestRecord = pet.records.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    res.json(latestRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

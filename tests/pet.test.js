// __tests__/pet.test.js
const request = require('supertest');
const express = require('express');
const petRoutes = require('../routes/pet');
const Pet = require('../models/Pet');
const Group = require('../models/Group');
const { mockPets, mockUsers, mockGroups, mockTokens } = require('./setup');

// Mock models
jest.mock('../models/Pet');
jest.mock('../models/Group');

// Mock authentication middleware
jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    if (token === mockTokens.validUser1Token) {
      req.user = { id: mockUsers.user1._id, role: 'user' };
      return next();
    }
    
    if (token === mockTokens.validUser2Token) {
      req.user = { id: mockUsers.user2._id, role: 'expert' };
      return next();
    }
    
    return res.status(403).json({ error: 'Invalid token' });
  };
});

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/pets', petRoutes);

describe('Pet Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pets', () => {
    test('TC-PET-001: Should create pet with all valid data', async () => {
      const newPetData = {
        name: 'Rocky',
        breed: 'Beagle',
        age_years: 2,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        group_id: mockGroups.group1._id,
        species: 'Dog'
      };

      const savedPet = {
        _id: '507f1f77bcf86cd799439034',
        ...newPetData,
        user_id: mockUsers.user1._id,
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => savedPet);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...mockGroups.group1,
        pets: [savedPet._id]
      });

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(newPetData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Pet created and added to group');
      expect(response.body.pet).toHaveProperty('name', 'Rocky');
      expect(response.body.group).toBeDefined();
    });

    test('TC-PET-002: Should fail with missing required fields', async () => {
      const incompletePetData = {
        name: 'Rocky',
        breed: 'Beagle'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(incompletePetData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All fields are required');
    });

    test('TC-PET-003: Should fail without authentication', async () => {
      const newPetData = {
        name: 'Rocky',
        breed: 'Beagle',
        age_years: 2,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        group_id: mockGroups.group1._id,
        species: 'Dog'
      };

      const response = await request(app)
        .post('/api/pets')
        .send(newPetData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('TC-PET-004: Should fail with non-existent group_id', async () => {
      const newPetData = {
        name: 'Rocky',
        breed: 'Beagle',
        age_years: 2,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        group_id: 'nonexistent123',
        species: 'Dog'
      };

      const savedPet = {
        _id: '507f1f77bcf86cd799439034',
        ...newPetData,
        user_id: mockUsers.user1._id,
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => savedPet);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(newPetData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Group not found to update with new pet');
    });
  });

  describe('POST /api/pets/:petId/records', () => {
    test('TC-PET-005: Should add record to pet with valid data', async () => {
      const recordData = {
        date: '2024-03-15',
        bcs_score: 5,
        weight: 31.2,
        front_image_url: 'uploads/front3.jpg'
      };

      const mockPet = {
        ...mockPets.pet1,
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.findById = jest.fn().mockResolvedValue(mockPet);

      const response = await request(app)
        .post(`/api/pets/${mockPets.pet1._id}/records`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(recordData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Record added');
      expect(response.body.record).toHaveProperty('date', '2024-03-15');
    });

    test('TC-PET-006: Should fail with missing required fields', async () => {
      const incompleteRecordData = {
        weight: 31.2
        // Missing date and bcs_score
      };

      const response = await request(app)
        .post(`/api/pets/${mockPets.pet1._id}/records`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(incompleteRecordData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('bcs_score and date are required');
    });

    test('TC-PET-007: Should fail for non-existent pet', async () => {
      const recordData = {
        date: '2024-03-15',
        bcs_score: 5
      };

      Pet.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/pets/nonexistentpet123/records')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(recordData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Pet not found');
    });

    test('TC-PET-008: Should fail for pet owned by different user', async () => {
      const recordData = {
        date: '2024-03-15',
        bcs_score: 5
      };

      // User1 trying to add record to User2's pet
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet3);

      const response = await request(app)
        .post(`/api/pets/${mockPets.pet3._id}/records`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(recordData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized: Pet does not belong to user');
    });
  });

  describe('GET /api/pets/:petId', () => {
    test('TC-PET-009: Should get pet info with valid petId and user ownership', async () => {
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet1);

      const response = await request(app)
        .get(`/api/pets/${mockPets.pet1._id}`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Buddy');
      expect(response.body).toHaveProperty('breed', 'Golden Retriever');
    });

    test('TC-PET-010: Should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/pets/${mockPets.pet1._id}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('TC-PET-011: Should fail for non-existent pet', async () => {
      Pet.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pets/nonexistentpet123')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Pet not found');
    });

    test('TC-PET-012: Should fail for pet owned by different user', async () => {
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet3);

      const response = await request(app)
        .get(`/api/pets/${mockPets.pet3._id}`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized: Pet does not belong to user');
    });
  });

  describe('GET /api/pets/:petId/records/latest', () => {
    test('TC-PET-013: Should get latest record for pet with records', async () => {
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet1);

      const response = await request(app)
        .get(`/api/pets/${mockPets.pet1._id}/records/latest`)
        .query({ user_id: mockUsers.user1._id })
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('date', '2024-03-15'); // Latest record
      expect(response.body).toHaveProperty('bcs_score', 5);
    });

    test('TC-PET-014: Should fail for pet with no records', async () => {
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet2);

      const response = await request(app)
        .get(`/api/pets/${mockPets.pet2._id}/records/latest`)
        .query({ user_id: mockUsers.user1._id })
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No records found for this pet');
    });

    test('TC-PET-015: Should fail without user_id', async () => {
      const response = await request(app)
        .get(`/api/pets/${mockPets.pet1._id}/records/latest`)
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('user_id is required');
    });

    test('TC-PET-016: Should fail for pet owned by different user', async () => {
      Pet.findById = jest.fn().mockResolvedValue(mockPets.pet3);

      const response = await request(app)
        .get(`/api/pets/${mockPets.pet3._id}/records/latest`)
        .query({ user_id: mockUsers.user1._id })
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized: Pet does not belong to user');
    });
  });
});
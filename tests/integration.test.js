// __tests__/integration.test.js
const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/user');
const groupRoutes = require('../routes/group');
const petRoutes = require('../routes/pet');
const User = require('../models/User');
const Group = require('../models/Group');
const Pet = require('../models/Pet');
const jwt = require('jsonwebtoken');

// Mock models
jest.mock('../models/User');
jest.mock('../models/Group');
jest.mock('../models/Pet');
jest.mock('jsonwebtoken');

// Mock authentication middleware
jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    if (token === 'validtoken123') {
      req.user = { id: 'user123', role: 'user' };
      return next();
    }
    
    return res.status(403).json({ error: 'Invalid token' });
  };
});

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/pets', petRoutes);

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-INTEGRATION-001: Complete user flow from signup to pet creation', () => {
    test('Should complete full workflow', async () => {
      // Step 1: Signup user
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        _id: 'user123',
        firstname: 'John',
        lastname: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        phone: '1234567890',
        role: 'user'
      });
      jwt.sign.mockReturnValue('validtoken123');

      const signupResponse = await request(app)
        .post('/api/users/signup')
        .send({
          firstname: 'John',
          lastname: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          phone: '1234567890',
          role: 'user'
        });

      expect(signupResponse.status).toBe(201);
      const token = signupResponse.body.token;

      // Step 2: Create group
      const savedGroup = {
        _id: 'group123',
        group_name: 'My Pets',
        user_id: 'user123',
        pets: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Group.mockImplementation(() => savedGroup);
      User.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const groupResponse = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'My Pets' });

      expect(groupResponse.status).toBe(201);
      const groupId = groupResponse.body.group._id;

      // Step 3: Create pet
      const savedPet = {
        _id: 'pet123',
        name: 'Buddy',
        breed: 'Golden Retriever',
        age_years: 3,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        species: 'Dog',
        group_id: groupId,
        user_id: 'user123',
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => savedPet);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue(savedGroup);

      const petResponse = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Buddy',
          breed: 'Golden Retriever',
          age_years: 3,
          age_months: 6,
          gender: 'Male',
          spay_neuter_status: 'Neutered',
          group_id: groupId,
          species: 'Dog'
        });

      expect(petResponse.status).toBe(201);
      const petId = petResponse.body.pet._id;

      // Step 4: Add record to pet
      const mockPetWithRecords = {
        ...savedPet,
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.findById = jest.fn().mockResolvedValue(mockPetWithRecords);

      const recordResponse = await request(app)
        .post(`/api/pets/${petId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2024-03-15',
          bcs_range: '5',
          weight: 30.5,
          front_image_url: 'uploads/front.jpg'
        });

      expect(recordResponse.status).toBe(201);

      // Step 5: Get pet with records
      mockPetWithRecords.records = [{
        date: '2024-03-15',
        bcs_range: '5',
        weight: 30.5,
        front_image_url: 'uploads/front.jpg'
      }];

      const getPetResponse = await request(app)
        .get(`/api/pets/${petId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getPetResponse.status).toBe(200);
      expect(getPetResponse.body).toHaveProperty('records');
      expect(getPetResponse.body.records).toHaveLength(1);
    });
  });

  describe('TC-INTEGRATION-002: Multiple pets in multiple groups', () => {
    test('Should manage multiple pets across groups', async () => {
      const token = 'validtoken123';

      // Create first group
      const group1 = {
        _id: 'group1',
        group_name: 'Dogs',
        user_id: 'user123',
        pets: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Group.mockImplementation(() => group1);
      User.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const group1Response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'Dogs' });

      expect(group1Response.status).toBe(201);

      // Create second group
      const group2 = {
        _id: 'group2',
        group_name: 'Cats',
        user_id: 'user123',
        pets: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Group.mockImplementation(() => group2);

      const group2Response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'Cats' });

      expect(group2Response.status).toBe(201);

      // Create pet in first group
      const pet1 = {
        _id: 'pet1',
        name: 'Buddy',
        breed: 'Golden Retriever',
        species: 'Dog',
        group_id: 'group1',
        user_id: 'user123',
        age_years: 3,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => pet1);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...group1,
        pets: ['pet1']
      });

      const pet1Response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Buddy',
          breed: 'Golden Retriever',
          age_years: 3,
          age_months: 6,
          gender: 'Male',
          spay_neuter_status: 'Neutered',
          group_id: 'group1',
          species: 'Dog'
        });

      expect(pet1Response.status).toBe(201);

      // Create pet in second group
      const pet2 = {
        _id: 'pet2',
        name: 'Whiskers',
        breed: 'Persian',
        species: 'Cat',
        group_id: 'group2',
        user_id: 'user123',
        age_years: 2,
        age_months: 3,
        gender: 'Female',
        spay_neuter_status: 'Spayed',
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => pet2);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...group2,
        pets: ['pet2']
      });

      const pet2Response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Whiskers',
          breed: 'Persian',
          age_years: 2,
          age_months: 3,
          gender: 'Female',
          spay_neuter_status: 'Spayed',
          group_id: 'group2',
          species: 'Cat'
        });

      expect(pet2Response.status).toBe(201);

      // Verify groups contain correct pets
      Group.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { ...group1, pets: [pet1] },
          { ...group2, pets: [pet2] }
        ])
      });

      const groupsResponse = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(groupsResponse.status).toBe(200);
      expect(groupsResponse.body.groups).toHaveLength(2);
    });
  });

  describe('TC-INTEGRATION-003: Pet record timeline', () => {
    test('Should manage multiple records and get latest correctly', async () => {
      const token = 'validtoken123';

      // Create pet
      const savedPet = {
        _id: 'pet123',
        name: 'Buddy',
        breed: 'Golden Retriever',
        age_years: 3,
        age_months: 6,
        gender: 'Male',
        spay_neuter_status: 'Neutered',
        species: 'Dog',
        group_id: 'group123',
        user_id: 'user123',
        records: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Pet.mockImplementation(() => savedPet);
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const petResponse = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Buddy',
          breed: 'Golden Retriever',
          age_years: 3,
          age_months: 6,
          gender: 'Male',
          spay_neuter_status: 'Neutered',
          group_id: 'group123',
          species: 'Dog'
        });

      const petId = petResponse.body.pet._id;

      // Add first record (older)
      Pet.findById = jest.fn().mockResolvedValue(savedPet);

      await request(app)
        .post(`/api/pets/${petId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2024-01-15',
          bcs_range: '5',
          weight: 30.5
        });

      savedPet.records.push({
        date: '2024-01-15',
        bcs_range: '5',
        weight: 30.5
      });

      // Add second record (newer)
      await request(app)
        .post(`/api/pets/${petId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2024-02-20',
          bcs_range: '4',
          weight: 29.8
        });

      savedPet.records.push({
        date: '2024-02-20',
        bcs_range: '4',
        weight: 29.8
      });

      // Add third record (newest)
      await request(app)
        .post(`/api/pets/${petId}/records`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2024-03-10',
          bcs_range: '4',
          weight: 29.5
        });

      savedPet.records.push({
        date: '2024-03-10',
        bcs_range: '4',
        weight: 29.5
      });

      // Verify latest record is returned correctly
      const latestResponse = await request(app)
        .get(`/api/pets/${petId}/records/latest`)
        .set('Authorization', `Bearer ${token}`)
        .query({ user_id: 'user123' });

      expect(latestResponse.status).toBe(200);
      expect(latestResponse.body.date).toBe('2024-03-10');
      expect(latestResponse.body.weight).toBe(29.5);
    });
  });
});
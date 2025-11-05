// __tests__/group.test.js
const request = require('supertest');
const express = require('express');
const groupRoutes = require('../routes/group');
const Group = require('../models/Group');
const User = require('../models/User');
const { mockGroups, mockUsers, mockTokens } = require('./setup');

// Mock models
jest.mock('../models/Group');
jest.mock('../models/User');

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
app.use('/api/groups', groupRoutes);

describe('Group Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/groups', () => {
    test('TC-GROUP-001: Should create group with valid data and authentication', async () => {
      const newGroupData = {
        group_name: 'My Birds'
      };

      const savedGroup = {
        _id: '507f1f77bcf86cd799439024',
        group_name: 'My Birds',
        user_id: mockUsers.user1._id,
        pets: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Group.mockImplementation(() => savedGroup);
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUsers.user1);

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send(newGroupData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Group created');
      expect(response.body.group).toHaveProperty('group_name', 'My Birds');
    });

    test('TC-GROUP-002: Should fail without authentication', async () => {
      const newGroupData = {
        group_name: 'My Birds'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(newGroupData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('TC-GROUP-003: Should fail with missing group_name', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('group_name is required');
    });

    test('TC-GROUP-004: Should fail with invalid token', async () => {
      const newGroupData = {
        group_name: 'My Birds'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${mockTokens.invalidToken}`)
        .send(newGroupData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('GET /api/groups', () => {
    test('TC-GROUP-005: Should get all groups with valid authentication', async () => {
      const userGroups = [
        { ...mockGroups.group1, pets: [] },
        { ...mockGroups.group2, pets: [] }
      ];

      Group.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(userGroups)
      });

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toHaveLength(2);
      expect(response.body.groups[0]).toHaveProperty('group_name');
    });

    test('TC-GROUP-006: Should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/groups');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('TC-GROUP-007: Should return empty array for user with no groups', async () => {
      Group.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${mockTokens.validUser1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.groups).toEqual([]);
    });
  });
});
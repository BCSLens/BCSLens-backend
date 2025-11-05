// __tests__/user.test.js
const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/user');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { mockUsers } = require('./setup');

// Mock the User model
jest.mock('../models/User');

// Mock jwt
jest.mock('jsonwebtoken');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users/signup', () => {
    test('TC-AUTH-001: Should signup with valid data', async () => {
      const newUser = {
        firstname: 'Test',
        lastname: 'User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        phone: '1234567890',
        role: 'user'
      };

      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439099',
        ...newUser
      });
      jwt.sign.mockReturnValue('mocktoken123');

      const response = await request(app)
        .post('/api/users/signup')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('User created successfully');
    });

    test('TC-AUTH-002: Should fail with missing required fields', async () => {
      const incompleteUser = {
        firstname: 'Test',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/users/signup')
        .send(incompleteUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All fields are required');
    });

    test('TC-AUTH-003: Should fail with password mismatch', async () => {
      const userData = {
        firstname: 'Test',
        lastname: 'User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password456',
        phone: '1234567890',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Passwords do not match');
    });

    test('TC-AUTH-004: Should fail with existing email', async () => {
      const userData = {
        firstname: 'Test',
        lastname: 'User',
        username: 'newuser',
        email: 'john@example.com', // Existing email
        password: 'password123',
        confirmPassword: 'password123',
        phone: '1234567890',
        role: 'user'
      };

      User.findOne.mockResolvedValue(mockUsers.user1);

      const response = await request(app)
        .post('/api/users/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email or username already in use');
    });

    test('TC-AUTH-005: Should fail with existing username', async () => {
      const userData = {
        firstname: 'Test',
        lastname: 'User',
        username: 'johndoe', // Existing username
        email: 'newemail@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        phone: '1234567890',
        role: 'user'
      };

      User.findOne.mockResolvedValue(mockUsers.user1);

      const response = await request(app)
        .post('/api/users/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email or username already in use');
    });
  });

  describe('POST /api/users/login', () => {
    test('TC-AUTH-006: Should login with valid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };

      const mockUser = {
        ...mockUsers.user1,
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mocktoken123');

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Login successful');
    });

    test('TC-AUTH-007: Should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('TC-AUTH-008: Should fail with invalid password', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        ...mockUsers.user1,
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('TC-AUTH-009: Should fail with missing credentials', async () => {
      const loginData = {
        email: 'john@example.com'
        // Missing password
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
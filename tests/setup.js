// __tests__/setup.js
// Test setup and mock data

const mockUsers = {
  user1: {
    _id: '507f1f77bcf86cd799439011',
    firstname: 'John',
    lastname: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    phone: '1234567890',
    role: 'user',
    pets_group: []
  },
  user2: {
    _id: '507f1f77bcf86cd799439012',
    firstname: 'Jane',
    lastname: 'Smith',
    username: 'janesmith',
    email: 'jane@example.com',
    password: 'hashedPassword456',
    phone: '0987654321',
    role: 'expert',
    pets_group: []
  }
};

const mockGroups = {
  group1: {
    _id: '507f1f77bcf86cd799439021',
    group_name: 'My Dogs',
    user_id: '507f1f77bcf86cd799439011',
    pets: []
  },
  group2: {
    _id: '507f1f77bcf86cd799439022',
    group_name: 'My Cats',
    user_id: '507f1f77bcf86cd799439011',
    pets: []
  },
  group3: {
    _id: '507f1f77bcf86cd799439023',
    group_name: 'Jane\'s Pets',
    user_id: '507f1f77bcf86cd799439012',
    pets: []
  }
};

const mockPets = {
  pet1: {
    _id: '507f1f77bcf86cd799439031',
    name: 'Buddy',
    breed: 'Golden Retriever',
    age_years: 3,
    age_months: 6,
    gender: 'Male',
    spay_neuter_status: 'Neutered',
    species: 'Dog',
    group_id: '507f1f77bcf86cd799439021',
    user_id: '507f1f77bcf86cd799439011',
    records: [
      {
        _id: '507f1f77bcf86cd799439041',
        date: '2024-01-15',
        bcs_range: '5',
        weight: 30.5,
        front_image_url: 'uploads/front1.jpg',
        back_image_url: 'uploads/back1.jpg'
      },
      {
        _id: '507f1f77bcf86cd799439042',
        date: '2024-02-20',
        bcs_range: '4',
        weight: 29.8,
        front_image_url: 'uploads/front2.jpg'
      }
    ]
  },
  pet2: {
    _id: '507f1f77bcf86cd799439032',
    name: 'Whiskers',
    breed: 'Persian',
    age_years: 2,
    age_months: 3,
    gender: 'Female',
    spay_neuter_status: 'Spayed',
    species: 'Cat',
    group_id: '507f1f77bcf86cd799439022',
    user_id: '507f1f77bcf86cd799439011',
    records: []
  },
  pet3: {
    _id: '507f1f77bcf86cd799439033',
    name: 'Max',
    breed: 'Labrador',
    age_years: 5,
    age_months: 0,
    gender: 'Male',
    spay_neuter_status: 'Neutered',
    species: 'Dog',
    group_id: '507f1f77bcf86cd799439023',
    user_id: '507f1f77bcf86cd799439012',
    records: []
  }
};

const mockTokens = {
  validUser1Token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsInJvbGUiOiJ1c2VyIn0.mock',
  validUser2Token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsInJvbGUiOiJleHBlcnQifQ.mock',
  invalidToken: 'invalid.token.here',
  expiredToken: 'expired.token.here'
};

module.exports = {
  mockUsers,
  mockGroups,
  mockPets,
  mockTokens
};
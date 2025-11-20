# Pet Management & Body Condition Score API For BCSLens Application

A comprehensive Node.js/Express REST API for managing pets, tracking their body condition scores (BCS), and organizing them into groups. The system includes user authentication with refresh token rotation, image upload capabilities, comprehensive logging, and integrated Swagger documentation.

## Overview

This API provides a complete pet management system with the following features:

### Core Functionalities

1. **User Management**
   - User registration with privacy consent tracking
   - JWT-based authentication with access and refresh tokens
   - Token refresh mechanism with automatic rotation
   - Role-based access control (pet-owner/expert)
   - User profile management

2. **Pet Management**
   - Create and manage pet profiles
   - Track pet information (name, breed, age, gender, spay/neuter status, species)
   - Store detailed health records with BCS tracking
   - Authorization checks ensuring users can only access their own pets

3. **Group Management**
   - Organize pets into custom groups
   - Manage multiple pet groups per user
   - Duplicate group name prevention per user

4. **Health Record Tracking**
   - Record body condition scores (BCS)
   - Track weight changes over time
   - Store multi-view images (front, back, left, right, top)
   - Historical record keeping with timestamps
   - Retrieve latest records

5. **Image Upload & Management**
   - Secure image upload with validation
   - File type restrictions (JPEG, JPG, PNG, GIF only)
   - File size limit (5MB)
   - Random filename generation for security
   - Path traversal attack prevention
   - Authenticated image retrieval

6. **Security & Logging**
   - Comprehensive request/response logging
   - Security event tracking
   - Error logging with stack traces
   - Rate limiting on login endpoint
   - Privacy policy version tracking

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with dual-token system
- **File Upload:** Multer with diskStorage
- **Validation:** express-validator
- **Security:** bcryptjs for password hashing, crypto for random generation
- **Logging:** Winston (logger)
- **Documentation:** Swagger UI

## Prerequisites

- Node.js 14.x or higher
- MongoDB 4.x or higher (local or cloud instance)
- npm or yarn package manager

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

```bash
npm install
```

Required packages:
- express
- mongoose
- jsonwebtoken
- bcryptjs
- multer
- dotenv
- express-validator
- winston (for logging)
- swagger-ui-express
- swagger-jsdoc
- express-rate-limit (for login rate limiting)

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/pet-management

# JWT Secrets (MUST be different and strong in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
ACCESS_TOKEN_SECRET=your-access-token-secret-change-this-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-min-32-chars

# Privacy Policy
PRIVACY_POLICY_VERSION=v1.0
```

**Important Security Notes:**
- `JWT_SECRET` must be at least 32 characters in production
- Use different secrets for ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET
- Never commit `.env` file to version control

### 4. Start MongoDB

Ensure MongoDB is running on your system:

```bash
# If using local MongoDB
mongod

# Or if using MongoDB as a service
sudo systemctl start mongod
```

### 5. Run the Application

```bash
# Development mode
npm start

# Or with nodemon (auto-restart)
npm run dev
```

The server will start at `http://localhost:3000`

## Project Structure

```
.
├── config/
│   └── logger.js               # Winston logger configuration
├── middleware/
│   ├── auth.js                 # JWT authentication middleware
│   └── validators.js           # Input validation rules
├── models/
│   ├── User.js                 # User schema with privacy consent
│   ├── Pet.js                  # Pet schema and model
│   └── Group.js                # Group schema and model
├── routes/
│   ├── user.js                 # User auth & profile routes
│   ├── pet.js                  # Pet management routes
│   ├── group.js                # Group management routes
│   └── upload.js               # File upload routes
├── uploads/                    # Uploaded images directory (auto-created)
├── index.js                    # Main application entry point
├── swagger.js                  # Swagger configuration
├── package.json                # Project dependencies
├── .env                        # Environment variables (not in git)
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## API Endpoints

### Authentication

#### User Registration
```http
POST /api/users/signup
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "1234567890",
  "role": "pet-owner"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "pet-owner"
  }
}
```

#### User Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Login endpoint is rate-limited to prevent brute force attacks.

#### Refresh Access Token
```http
POST /api/users/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Refresh token is automatically rotated on each use for enhanced security.

#### Get Current User Profile
```http
GET /api/users/me
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "firstname": "John",
  "lastname": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "1234567890",
  "role": "pet-owner",
  "privacyConsent": {
    "accepted": true,
    "acceptedAt": "2025-01-15T10:30:00.000Z",
    "policyVersion": "v1.0"
  },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

### Group Management

**Note:** All group endpoints require authentication. Include JWT access token in header:
```
Authorization: Bearer <your-access-token>
```

#### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "group_name": "My Dogs"
}
```

**Response:**
```json
{
  "message": "Group created successfully",
  "group": {
    "_id": "507f1f77bcf86cd799439011",
    "group_name": "My Dogs",
    "user_id": "507f1f77bcf86cd799439012",
    "pets": []
  }
}
```

**Validation:**
- Group name is required
- Duplicate group names per user are not allowed
- User ID is automatically extracted from JWT token

#### Get All Groups
```http
GET /api/groups
Authorization: Bearer <token>
```

**Response:**
```json
{
  "groups": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "group_name": "My Dogs",
      "user_id": "507f1f77bcf86cd799439012",
      "pets": [
        {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Buddy",
          "breed": "Golden Retriever",
          "species": "Dog"
        }
      ]
    }
  ]
}
```

---

### Pet Management

#### Create Pet
```http
POST /api/pets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Buddy",
  "breed": "Golden Retriever",
  "age_years": 3,
  "age_months": 6,
  "gender": "Male",
  "spay_neuter_status": "Neutered",
  "species": "Dog",
  "group_id": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "message": "Pet created and added to group",
  "pet": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age_years": 3,
    "age_months": 6,
    "gender": "Male",
    "spay_neuter_status": "Neutered",
    "species": "Dog",
    "group_id": "507f1f77bcf86cd799439011",
    "user_id": "507f1f77bcf86cd799439012",
    "records": []
  }
}
```

**Validation:**
- All required fields must be provided
- Group must exist and belong to the authenticated user
- ObjectId format validation

#### Get Pet Details
```http
GET /api/pets/:petId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "pet": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age_years": 3,
    "age_months": 6,
    "gender": "Male",
    "spay_neuter_status": "Neutered",
    "species": "Dog",
    "group_id": "507f1f77bcf86cd799439011",
    "user_id": "507f1f77bcf86cd799439012",
    "records": [...]
  }
}
```

**Authorization:** Returns 403 if pet doesn't belong to authenticated user.

#### Add Health Record
```http
POST /api/pets/:petId/records
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-01-15",
  "type": "checkup",
  "bcs_score": 4,
  "weight": 30.5,
  "front_image_url": "http://localhost:3000/upload/abc123.jpg",
  "back_image_url": "http://localhost:3000/upload/def456.jpg",
  "left_image_url": "http://localhost:3000/upload/ghi789.jpg",
  "right_image_url": "http://localhost:3000/upload/jkl012.jpg",
  "top_image_url": "http://localhost:3000/upload/mno345.jpg"
}
```

**Response:**
```json
{
  "message": "Record added successfully",
  "record": {
    "date": "2025-01-15",
    "type": "checkup",
    "bcs_score": 4,
    "weight": 30.5,
    "front_image_url": "http://localhost:3000/upload/abc123.jpg",
    "back_image_url": "http://localhost:3000/upload/def456.jpg",
    "left_image_url": "http://localhost:3000/upload/ghi789.jpg",
    "right_image_url": "http://localhost:3000/upload/jkl012.jpg",
    "top_image_url": "http://localhost:3000/upload/mno345.jpg"
  }
}
```

**Authorization:** Only pet owner can add records.

#### Get Latest Record
```http
GET /api/pets/:petId/records/latest
Authorization: Bearer <token>
```

**Response:**
```json
{
  "record": {
    "_id": "507f1f77bcf86cd799439014",
    "date": "2025-01-15",
    "type": "checkup",
    "bcs_score": 4,
    "weight": 30.5,
    "front_image_url": "http://localhost:3000/upload/abc123.jpg",
    "back_image_url": "http://localhost:3000/upload/def456.jpg",
    "left_image_url": "http://localhost:3000/upload/ghi789.jpg",
    "right_image_url": "http://localhost:3000/upload/jkl012.jpg",
    "top_image_url": "http://localhost:3000/upload/mno345.jpg"
  }
}
```

**Note:** Returns 404 if no records exist for the pet.

---

### File Upload

#### Upload Image
```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.jpg"
}
```

**Restrictions:**
- Allowed formats: JPEG, JPG, PNG, GIF
- Maximum file size: 5MB
- Filename is randomly generated (32-character hex + extension)
- Authentication required

**Error Responses:**
```json
// File too large
{
  "error": "File too large (max 5MB)"
}

// Invalid file type
{
  "error": "Only images (jpg, png, gif) are allowed"
}

// No file provided
{
  "error": "No file uploaded"
}
```

#### Retrieve Image
```http
GET /api/upload/:filename
Authorization: Bearer <token>
```

**Returns:** The image file directly

**Security Features:**
- Filename format validation (must match: 32-hex-chars.ext)
- Path traversal attack prevention
- User authentication required
- Proper error handling for missing/inaccessible files

---

## Authentication Flow

1. **Register:** User creates account via `/api/users/signup`
   - Receives both access token (15min) and refresh token (7d)
   - Privacy consent is automatically recorded

2. **Login:** User authenticates via `/api/users/login`
   - Receives fresh access and refresh tokens
   - Rate limited to prevent brute force attacks

3. **Access Protected Routes:** Include access token in `Authorization: Bearer <token>` header

4. **Token Refresh:** When access token expires:
   - Use `/api/users/refresh` with refresh token
   - Receive new access token AND new refresh token
   - Old refresh token is invalidated (rotation)

5. **Token Validation:** 
   - Middleware validates token signature and expiration
   - Extracts user ID and role from token payload
   - Verifies user authorization for requested resources

## Security Features

### Authentication & Authorization
- **Dual-token system:** Short-lived access tokens (15min) + long-lived refresh tokens (7d)
- **Refresh token rotation:** Each refresh generates new tokens and invalidates old ones
- **Password hashing:** bcryptjs with salt rounds
- **JWT validation:** Token signature verification and expiration checks
- **Role-based access control:** Routes protected by user roles (pet-owner/expert)
- **Resource ownership verification:** Users can only access their own pets and groups

### Input Validation
- **express-validator:** All inputs validated before processing
- **ObjectId validation:** Ensures valid MongoDB ObjectID format
- **Duplicate prevention:** Checks for existing usernames/emails/group names
- **File type validation:** Restricted to specific image formats

### Attack Prevention
- **Rate limiting:** Login endpoint protected against brute force
- **Path traversal protection:** File access validated against allowed directory
- **SQL/NoSQL injection protection:** Mongoose parameterized queries
- **CORS:** Configurable cross-origin resource sharing
- **Error handling:** Generic error messages in production mode

### File Upload Security
- **Random filenames:** Crypto-generated names prevent guessing
- **File size limits:** 5MB maximum
- **File type restrictions:** Only JPEG, JPG, PNG, GIF allowed
- **Secure storage:** Files stored outside web root
- **Authenticated access:** File retrieval requires valid token

### Logging & Monitoring
- **Comprehensive logging:** Winston logger for all operations
- **Security event tracking:** Failed logins, unauthorized access attempts
- **Error logging:** Stack traces for debugging (not exposed to clients)
- **Audit trail:** User actions logged with IP addresses and timestamps

### Production Hardening
- **Environment-based error messages:** Generic errors in production
- **JWT secret validation:** Minimum length requirements enforced
- **Configuration validation:** Required env vars checked at startup
- **Privacy policy versioning:** Tracks user consent to terms

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors, invalid data)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (valid token but insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

**Error Response Format:**
```json
{
  "error": "Descriptive error message"
}
```

**Validation Error Format:**
```json
{
  "errors": [
    {
      "msg": "Email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

## Logging

The application uses Winston logger with structured logging:

### Log Levels
- **info:** Successful operations, user actions
- **warn:** Validation failures, unauthorized attempts, missing resources
- **error:** Server errors, exceptions with stack traces

### Logged Information
- User actions (login, signup, profile access)
- Resource operations (pet/group creation, record additions)
- Security events (failed auth, unauthorized access)
- File operations (uploads, retrievals)
- Errors with full stack traces and context

### Log Context
Each log entry includes:
- User ID (when available)
- IP address
- Timestamp
- Action/operation type
- Relevant data (sanitized, no passwords)

## API Documentation

Interactive API documentation is available via Swagger UI:

**Access:** `http://localhost:3000/api-docs`

Features:
- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication handling

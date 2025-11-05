# Pet Management & Body Condition Score API For BCSLens Application

A comprehensive Node.js/Express REST API for managing pets, tracking their body condition scores (BCS), and organizing them into groups. The system includes user authentication, image upload capabilities, and integrated Swagger documentation.

## Overview

This API provides a complete pet management system with the following features:

### Core Functionalities

1. **User Management**
   - User registration and authentication
   - JWT-based authorization
   - Role-based access (user/expert)

2. **Pet Management**
   - Create and manage pet profiles
   - Track pet information (name, breed, age, gender, etc.)
   - Store detailed health records with BCS tracking

3. **Group Management**
   - Organize pets into custom groups
   - Manage multiple pet groups per user

4. **Health Record Tracking**
   - Record body condition scores (BCS)
   - Track weight changes over time
   - Store multi-view images (front, back, left, right, top)
   - Historical record keeping with timestamps

5. **Image Upload**
   - Secure image upload and storage
   - Image retrieval via URLs

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Documentation:** Swagger UI
- **Security:** bcrypt for password hashing

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
- swagger-ui-express
- swagger-jsdoc

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/pet-management

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important:** Change `JWT_SECRET` to a strong, random string in production.

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
├── middleware/
│   └── auth.js                 # JWT authentication 
├── models/
│   ├── User.js                 # User schema and model
│   ├── Pet.js                  # Pet schema and model
│   └── Group.js                # Group schema and model
├── routes/
│   ├── user.js                 # User authentication 
│   ├── pet.js                  # Pet management routes
│   ├── group.js                # Group management routes
│   └── upload.js               # File upload routes
├── uploads/                    # Uploaded images directory
├── index.js                    # Main application entry 
├── swagger.js                  # Swagger configuration
├── package.json                # Project dependencies
├── .env                        # Environment variables 
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
  "confirmPassword": "securePassword123",
  "phone": "1234567890",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstname": "John",
    "lastname": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user"
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Group Management

**Note:** All group endpoints require authentication. Include JWT token in header:
```
Authorization: Bearer <your-jwt-token>
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
      "pets": [...]
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

#### Get Pet Details
```http
GET /api/pets/:petId
Authorization: Bearer <token>
```

#### Add Health Record
```http
POST /api/pets/:petId/records
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-01-15",
  "bcs_range": "IDEAL",
  "weight": 30.5,
  "front_image_url": "http://localhost:3000/upload/1234567890.jpg",
  "back_image_url": "http://localhost:3000/upload/1234567891.jpg",
  "left_image_url": "http://localhost:3000/upload/1234567892.jpg",
  "right_image_url": "http://localhost:3000/upload/1234567893.jpg",
  "top_image_url": "http://localhost:3000/upload/1234567894.jpg"
}
```

#### Get Latest Record
```http
GET /api/pets/:petId/records/latest?user_id=<user_id>
Authorization: Bearer <token>
```

---

### File Upload

#### Upload Image
```http
POST /upload
Content-Type: multipart/form-data

image: <file>
```

**Response:**
```json
{
  "message": "File uploaded!",
  "filename": "1641234567890.jpg"
}
```

#### Retrieve Image
```http
GET /upload/:filename
```

Returns the image file.


## Authentication Flow

1. **Register:** User creates account via `/api/users/signup`
2. **Login:** User authenticates via `/api/users/login` and receives JWT token
3. **Access Protected Routes:** Include token in `Authorization` header for all protected endpoints
4. **Token Validation:** Middleware validates token and extracts user information

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Protected routes with authentication middleware
- User ownership verification for pets and groups
- Input validation on all endpoints

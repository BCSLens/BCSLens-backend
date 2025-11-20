const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const { generalLimiter } = require('./middleware/rateLimiter');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐ Global NoSQL Injection Protection
app.use(mongoSanitize());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection error:', err));

// Routes
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const petRoutes = require('./routes/pet');
const groupRoutes = require('./routes/group');

app.use('/api', generalLimiter)
app.use('/api/users', userRoutes);   // /signup, /login
app.use('/api/upload', uploadRoutes);    // other file upload or media routes
app.use('/api/pets', petRoutes); 
app.use('/api/groups', groupRoutes);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});

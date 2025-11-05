const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection error:', err));

// Routes
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const petRoutes = require('./routes/pet');
const groupRoutes = require('./routes/group');

app.use('/api/users', userRoutes);   // /signup, /login
app.use('/upload', uploadRoutes);    // other file upload or media routes
app.use('/api/pets', petRoutes); 
app.use('/api/groups', groupRoutes); // /group

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});

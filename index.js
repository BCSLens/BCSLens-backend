const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');
const { generalLimiter } = require('./middleware/rateLimiter');
const helmet = require("helmet");
const cors = require('cors');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

dotenv.config(); // Load environment variables

const app = express();

// Security Middlewares
app.use(
  helmet({
    // HSTS: V3.4.1
    hsts: {
      maxAge: 31536000,       // 1 ปี
      includeSubDomains: true, // ครอบคลุม subdomains
      preload: true
    },
    // X-Content-Type-Options: V3.4.4
    contentTypeOptions: true,
    // Frameguard ไม่ใช้ X-Frame-Options (obsolete), ใช้ CSP แทน
    frameguard: false
  })
);

// Content-Security-Policy: V3.4.3 + 3.4.6
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],       // โหลด content จากแหล่งของตัวเองเท่านั้น
      objectSrc: ["'none'"],        // object/embed ไม่อนุญาต
      baseUri: ["'none'"],          // base tag ไม่อนุญาต
      scriptSrc: ["'self'"],        // สคริปต์จากตัวเอง (ถ้าต้องใช้ nonce/hash สามารถเพิ่มได้)
      styleSrc: ["'self'"],         // style จากตัวเอง
      frameAncestors: ["'none'"],   // ป้องกัน embedding, 3.4.6
      imgSrc: ["'self'", "data:"],  // รูปภาพจากตัวเองและ data URLs (ปรับได้ตามต้องการ)
      fontSrc: ["'self'"],          // fonts จากตัวเอง
      connectSrc: ["'self'"],       // API requests
      mediaSrc: ["'self'"]
    },
    reportOnly: false // ตั้งเป็น true ถ้าอยาก test ก่อน
  })
);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

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

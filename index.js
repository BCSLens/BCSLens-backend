// index.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เชื่อมต่อ Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// เชื่อมต่อกับ /users route
const userRoutes = require('./routes/user');
app.use('/users', userRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/upload', uploadRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

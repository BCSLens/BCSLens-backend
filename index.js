const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connect to Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// connect to routes
const uploadRoutes = require('./routes/upload');
app.use('/upload', uploadRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

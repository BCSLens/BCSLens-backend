const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Middleware: Authenticate token and optionally check role
 * @param {string|string[]} allowedRoles - role หรือ array ของ roles ที่อนุญาต
 */
const authenticateToken = (allowedRoles = null) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token.' });

      req.user = user; // Add user info to request object

      if (allowedRoles) {
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!rolesArray.includes(user.role)) {
          return res.status(403).json({ error: 'Access denied. Insufficient role.' });
        }
      }

      next();
    });
  };
};

module.exports = authenticateToken;

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Check authorization header or HTTP-only cookies
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtsecretkey123!');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid or expired' });
  }
};

module.exports = { verifyToken };

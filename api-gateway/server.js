const express = require('express');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_university_jwt_key_2026';

const authenticateRole = (allowedRole) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access Denied: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: 'Access Denied: Token expired' });
        }
        return res.status(403).json({ success: false, message: 'Access Denied: Invalid token' });
      }
      if (decoded.role !== allowedRole) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: '${decoded.role}' is not authorized to access this resource`
        });
      }
      req.user = decoded;
      next();
    });
  };
};

app.use('/register', proxy(process.env.REGISTER_SERVICE_URL || 'http://127.0.0.1:5001', {
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/auth', proxy(process.env.LOGIN_SERVICE_URL || 'http://127.0.0.1:5002', {
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/admin', authenticateRole('admin'), proxy(process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:5003', {
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/user', authenticateRole('user'), proxy(process.env.USER_SERVICE_URL || 'http://127.0.0.1:5004', {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user && srcReq.user.userId) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
    }
    return proxyReqOpts;
  }
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));

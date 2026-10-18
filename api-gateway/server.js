const express = require('express');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// ================= EC2 DEPLOYMENT (Project 2) =================
// EC2 #1 : API Gateway (5000) + Registration (5001) + Login (5002)
// EC2 #2 : Admin Microservice (5003)
// EC2 #3 : User Microservice  (5004)
// Replace the IPs below with your EC2 PUBLIC IPs, commit and push.
const EC2_1_IP = process.env.EC2_1_IP || '127.0.0.1';                      // gateway box itself
const EC2_2_IP = process.env.EC2_2_IP || 'REPLACE_WITH_EC2_2_PUBLIC_IP';   // admin-service
const EC2_3_IP = process.env.EC2_3_IP || 'REPLACE_WITH_EC2_3_PUBLIC_IP';   // user-service

const REGISTER_SERVICE_URL = process.env.REGISTER_SERVICE_URL || `http://${EC2_1_IP}:5001`;
const LOGIN_SERVICE_URL    = process.env.LOGIN_SERVICE_URL    || `http://${EC2_1_IP}:5002`;
const ADMIN_SERVICE_URL    = process.env.ADMIN_SERVICE_URL    || `http://${EC2_2_IP}:5003`;
const USER_SERVICE_URL     = process.env.USER_SERVICE_URL     || `http://${EC2_3_IP}:5004`;
// ===============================================================

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

// Health check - open http://<EC2_1_PUBLIC_IP>:5000/ in a browser
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'API Gateway',
    routes: {
      register: `${REGISTER_SERVICE_URL}  (POST /register/userregister)`,
      login: `${LOGIN_SERVICE_URL}  (POST /auth/login)`,
      admin: `${ADMIN_SERVICE_URL}  (GET /admin/viewalluser - admin JWT)`,
      user: `${USER_SERVICE_URL}  (PUT /user/updateprofile - user JWT)`
    }
  });
});

const proxyError = (name) => (err, res, next) => {
  res.status(502).json({ success: false, message: `${name} unreachable: ${err.code || err.message}` });
};

app.use('/register', proxy(REGISTER_SERVICE_URL, {
  proxyErrorHandler: proxyError('Registration Service'),
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/auth', proxy(LOGIN_SERVICE_URL, {
  proxyErrorHandler: proxyError('Login Service'),
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/admin', authenticateRole('admin'), proxy(ADMIN_SERVICE_URL, {
  proxyErrorHandler: proxyError('Admin Service'),
  proxyReqPathResolver: (req) => req.originalUrl
}));

app.use('/user', authenticateRole('user'), proxy(USER_SERVICE_URL, {
  proxyErrorHandler: proxyError('User Service'),
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user && srcReq.user.userId) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
    }
    return proxyReqOpts;
  }
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log({ REGISTER_SERVICE_URL, LOGIN_SERVICE_URL, ADMIN_SERVICE_URL, USER_SERVICE_URL });
});

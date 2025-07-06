const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const checkIsVerified = require('../middleware/checkIsVerified');
const verifyJWT = require('../middleware/verifyJWT');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 request per windowMs
  message: 'Too many authentication attempts, please try again later.',
});

router.post('/register', authLimiter, authController.handleRegistration);
router.get('/verify-email', authController.handleVerifyEmail);
router.post('/login', checkIsVerified, authLimiter, authController.handleLogin);
router.put('/profile', verifyJWT, authController.handleProfileUpdate);
router.patch('/password', verifyJWT, authController.handlePasswordChange);

router.post('resend-verification', authLimiter, authController.handleResendVerification)

module.exports = router;

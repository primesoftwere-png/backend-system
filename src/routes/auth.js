import express from 'express';
import {
  login,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (Require valid JWT)
router.get('/profile', protect, getProfile);
router.post('/change-password', protect, changePassword);

export default router;

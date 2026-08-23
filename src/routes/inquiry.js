import express from 'express';
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
} from '../controllers/inquiryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for website visitors to submit inquiries
router.post('/', createInquiry);

// Protected routes for admins to manage inquiries (requires JWT login)
router.route('/')
  .get(protect, getInquiries);

router.route('/:id')
  .get(protect, getInquiryById)
  .put(protect, updateInquiryStatus)
  .delete(protect, deleteInquiry);

export default router;

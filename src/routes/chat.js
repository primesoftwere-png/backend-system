import express from 'express';
import { generateChatResponse } from '../controllers/chatController.js';

const router = express.Router();

// Define route for generating a chat response
router.post('/', generateChatResponse);

export default router;

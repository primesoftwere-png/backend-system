import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import connectDB from './config/db.js';
import healthRoutes from './routes/health.js';
import businessRoutes from './routes/business.js';
import campaignRoutes from './routes/campaign.js';
import { rescheduleEmailCampaigns } from './controllers/campaignController.js';
import authRoutes from './routes/auth.js';
import inquiryRoutes from './routes/inquiry.js';
import chatRoutes from './routes/chat.js';
import dashboardRoutes from './routes/dashboard.js';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// 1. Set Security HTTP Headers
app.use(helmet());

// 2. Global Rate Limiting to prevent DDoS and Brute-Force
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 100 requests per 10 minutes
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// 3. Enable CORS (Open for all origins as requested)
app.use(cors('*'));

// 4. Body parser (Reading data from body into req.body with limit)
app.use(express.json({ limit: '10kb' }));

// 5. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6. Data sanitization against Cross-Site Scripting (XSS)
app.use(xss());

// 7. Prevent HTTP Parameter Pollution
app.use(hpp());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Get Port and Backend URL from environment variables
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at ${BACKEND_URL}`);
  console.log(`Health check API is available at ${BACKEND_URL}/api/health`);

  // Re-schedule any pending email campaigns that have a future sendingDateTime
  rescheduleEmailCampaigns();
});

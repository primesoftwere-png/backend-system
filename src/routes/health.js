import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', async (req, res) => {
  // Prepare the default health check response
  const healthStatus = {
    uptime: process.uptime(),
    status: 'Healthy',
    message: 'All connections and services are running',
    timestamp: new Date().toISOString(),
    services: {
      server: 'OK'
      // You can add more services here later (e.g., database: 'OK')
    }
  };

  try {
    // -------------------------------------------------------------
    // Add your connection checks here (Database, Redis, etc.)
    // Example: await database.authenticate();
    // -------------------------------------------------------------
    
    // Check MongoDB connection status
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
      99: 'Uninitialized',
    };
    healthStatus.services.database = dbStatusMap[dbState] || 'Unknown';

    if (dbState !== 1) {
      throw new Error(`Database is ${healthStatus.services.database}`);
    }

    // If all checks pass, return a 200 OK
    res.status(200).json(healthStatus);
  } catch (error) {
    // If any connection check fails, update the status and return a 503 Service Unavailable
    healthStatus.status = 'Error';
    healthStatus.message = 'One or more required services failed';
    healthStatus.error = error.message;

    res.status(503).json(healthStatus);
  }
});

export default router;

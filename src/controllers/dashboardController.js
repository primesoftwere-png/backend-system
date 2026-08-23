import Business from '../models/Business.js';
import Campaign from '../models/Campaign.js';
import Inquiry from '../models/Inquiry.js';
import os from 'os';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    // Apply date filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Run count queries in parallel
    const [totalBusinesses, totalCampaigns, totalInquiries] = await Promise.all([
      Business.countDocuments(filter),
      Campaign.countDocuments(filter),
      Inquiry.countDocuments(filter)
    ]);

    // Gather system status
    const systemStatus = {
      status: 'UP',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuLoad: os.loadavg()
    };

    res.status(200).json({
      success: true,
      data: {
        counts: {
          businesses: totalBusinesses,
          campaigns: totalCampaigns,
          inquiries: totalInquiries
        },
        systemStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

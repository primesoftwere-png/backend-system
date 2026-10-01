import Campaign from '../models/Campaign.js';
import Business from '../models/Business.js';
import schedule from 'node-schedule';
import { sendCampaignEmail } from '../utils/sendMail.js';
import { processEmailQueue } from '../utils/emailQueue.js';

// ============================================================
// In-memory map to track scheduled cron jobs so we can cancel
// them if needed and avoid duplicate scheduling on restart.
// ============================================================
const scheduledJobs = new Map();

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Public
export const createCampaign = async (req, res) => {
  try {
    const {
      issues,
      campaignName,
      campaignId,
      dateTime,
      sendingDateTime,
      businessRef,
      message,
      emailSubject,
      emailBody
    } = req.body;

    const campaignData = {
      issues,
      campaignName,
      campaignId,
      dateTime,
      sendingDateTime,
      businessRef,
      message,
      emailSubject,
      emailBody
    };

    Object.keys(campaignData).forEach(
      (key) => campaignData[key] === undefined && delete campaignData[key]
    );

    const campaign = await Campaign.create(campaignData);

    // Schedule email sending via cron if sendingDateTime is set
    if (campaign.sendingDateTime && campaign.emailSubject && campaign.emailBody) {
      const sendDate = new Date(campaign.sendingDateTime);
      const currentTime = new Date();

      if (sendDate > currentTime) {
        // Schedule the throttled email queue to start at sendingDateTime
        const jobName = `email-campaign-${campaign._id}`;
        const job = schedule.scheduleJob(jobName, sendDate, async () => {
          console.log(`[CronJob] Triggering scheduled email campaign: ${campaign.campaignId} at ${new Date().toISOString()}`);

          // Mark as cron-scheduled in DB to prevent duplicate triggers
          await Campaign.findByIdAndUpdate(campaign._id, {
            emailCronScheduled: true,
          });

          // Start the throttled email queue
          processEmailQueue(campaign._id);

          // Clean up from map after firing
          scheduledJobs.delete(jobName);
        });

        if (job) {
          scheduledJobs.set(jobName, job);
          console.log(`[CronJob] Scheduled email campaign "${campaign.campaignId}" for ${sendDate.toISOString()}`);
        }
      }
    }

    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @access  Public
export const getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, campaigns] = await Promise.all([
      Campaign.countDocuments({}),
      Campaign.find({})
        .populate('businessRef', 'name email')
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);
      
    res.status(200).json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single campaign by ID
// @route   GET /api/campaigns/:id
// @access  Public
export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('businessRef', 'name email').lean();
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a campaign
// @route   PUT /api/campaigns/:id
// @access  Public
export const updateCampaign = async (req, res) => {
  try {
    const {
      issues,
      campaignName,
      campaignId,
      dateTime,
      sendingDateTime,
      businessRef,
      message,
      emailSubject,
      emailBody
    } = req.body;

    const campaignData = {
      issues,
      campaignName,
      campaignId,
      dateTime,
      sendingDateTime,
      businessRef,
      message,
      emailSubject,
      emailBody
    };

    Object.keys(campaignData).forEach(
      (key) => campaignData[key] === undefined && delete campaignData[key]
    );

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      campaignData,
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.status(200).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Public
export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Cancel any scheduled cron job for this campaign
    const jobName = `email-campaign-${req.params.id}`;
    if (scheduledJobs.has(jobName)) {
      scheduledJobs.get(jobName).cancel();
      scheduledJobs.delete(jobName);
      console.log(`[CronJob] Cancelled scheduled job for deleted campaign: ${campaign.campaignId}`);
    }
    
    res.status(200).json({ message: 'Campaign removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all campaigns (only id and name)
// @route   GET /api/campaigns/names
// @access  Public
export const getCampaignNames = async (req, res) => {
  try {
    const campaigns = await Campaign.find({}, '_id campaignId campaignName message emailSubject emailBody').lean();
    res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get campaign details for sending SMS (only business name and phone number)
// @route   GET /api/campaigns/sending-sms/:campaigns_id
// @access  Public
export const getCampaignForSms = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.campaigns_id })
      .populate({
        path: 'businessRef',
        match: { isSend: false },
        select: 'name phoneNumber -_id'
      })
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// @desc    Send campaign emails with throttled queue
// @route   POST /api/campaigns/sending-email/:campaigns_id
// @access  Public
//
// This API:
// 1. Finds the campaign by campaignId
// 2. Uses emailSubject and emailBody from the campaign
// 3. Replaces [business name] placeholder with actual business name
// 4. Sends emails in batches of 20 with 10-minute gaps
// 5. Tracks progress via emailStatus / emailSentCount
// ============================================================
export const sendCampaignEmails = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.campaigns_id });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // Validate that emailSubject and emailBody are set
    if (!campaign.emailSubject || !campaign.emailBody) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must have both emailSubject and emailBody to send emails',
      });
    }

    // Prevent re-triggering if already sending or completed
    if (campaign.emailStatus === 'sending') {
      return res.status(409).json({
        success: false,
        message: 'Email campaign is already in progress',
        data: {
          emailStatus: campaign.emailStatus,
          emailSentCount: campaign.emailSentCount,
          emailTotalCount: campaign.emailTotalCount,
        },
      });
    }

    // Check how many businesses have email addresses
    const businessCount = await Business.countDocuments({
      _id: { $in: campaign.businessRef },
      email: { $exists: true, $ne: null, $ne: '' },
    });

    if (businessCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No businesses with email addresses found for this campaign',
      });
    }

    // Reset counters if re-sending a completed/failed campaign
    await Campaign.findByIdAndUpdate(campaign._id, {
      emailStatus: 'pending',
      emailSentCount: 0,
      emailTotalCount: businessCount,
    });

    // If campaign has sendingDateTime in the future, schedule it via cron
    if (campaign.sendingDateTime) {
      const sendDate = new Date(campaign.sendingDateTime);
      const currentTime = new Date();

      if (sendDate > currentTime) {
        // Schedule for the future
        const jobName = `email-campaign-${campaign._id}`;

        // Cancel any existing job for this campaign
        if (scheduledJobs.has(jobName)) {
          scheduledJobs.get(jobName).cancel();
        }

        const job = schedule.scheduleJob(jobName, sendDate, async () => {
          console.log(`[CronJob] Executing scheduled email campaign: ${campaign.campaignId}`);
          await Campaign.findByIdAndUpdate(campaign._id, { emailCronScheduled: true });
          processEmailQueue(campaign._id);
          scheduledJobs.delete(jobName);
        });

        if (job) {
          scheduledJobs.set(jobName, job);
        }

        return res.status(200).json({
          success: true,
          message: `Email campaign scheduled for ${sendDate.toISOString()}`,
          data: {
            campaignId: campaign.campaignId,
            scheduledAt: sendDate.toISOString(),
            totalEmails: businessCount,
            batchSize: 20,
            intervalMinutes: 10,
            estimatedCompletionMinutes: Math.ceil(businessCount / 20) * 10,
          },
        });
      }
    }

    // If sendingDateTime is in the past or not set, start immediately
    // Use setImmediate to start the queue asynchronously (non-blocking)
    setImmediate(() => {
      processEmailQueue(campaign._id);
    });

    return res.status(200).json({
      success: true,
      message: 'Email campaign started. Emails are being sent in throttled batches.',
      data: {
        campaignId: campaign.campaignId,
        emailSubject: campaign.emailSubject,
        totalEmails: businessCount,
        batchSize: 20,
        intervalMinutes: 10,
        estimatedCompletionMinutes: Math.ceil(businessCount / 20) * 10,
      },
    });
  } catch (error) {
    console.error(`[SendEmail] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get email sending status for a campaign
// @route   GET /api/campaigns/email-status/:campaigns_id
// @access  Public
export const getEmailStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findOne(
      { campaignId: req.params.campaigns_id },
      'campaignId campaignName emailStatus emailSentCount emailTotalCount emailCronScheduled sendingDateTime'
    ).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// Re-schedule pending email campaigns on server startup
// This ensures that if the server restarts, any campaigns
// with a future sendingDateTime that haven't been sent yet
// get re-scheduled automatically.
// ============================================================
export const rescheduleEmailCampaigns = async () => {
  try {
    const pendingCampaigns = await Campaign.find({
      emailStatus: { $in: ['pending'] },
      sendingDateTime: { $gt: new Date() },
      emailSubject: { $exists: true, $ne: null },
      emailBody: { $exists: true, $ne: null },
      emailCronScheduled: false,
    });

    for (const campaign of pendingCampaigns) {
      const sendDate = new Date(campaign.sendingDateTime);
      const jobName = `email-campaign-${campaign._id}`;

      const job = schedule.scheduleJob(jobName, sendDate, async () => {
        console.log(`[CronJob] Re-scheduled campaign firing: ${campaign.campaignId}`);
        await Campaign.findByIdAndUpdate(campaign._id, { emailCronScheduled: true });
        processEmailQueue(campaign._id);
        scheduledJobs.delete(jobName);
      });

      if (job) {
        scheduledJobs.set(jobName, job);
        console.log(`[Startup] Re-scheduled email campaign "${campaign.campaignId}" for ${sendDate.toISOString()}`);
      }
    }

    if (pendingCampaigns.length > 0) {
      console.log(`[Startup] Re-scheduled ${pendingCampaigns.length} pending email campaign(s)`);
    }
  } catch (error) {
    console.error(`[Startup] Error re-scheduling campaigns: ${error.message}`);
  }
};

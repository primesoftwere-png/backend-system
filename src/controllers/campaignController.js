import Campaign from '../models/Campaign.js';
import Business from '../models/Business.js';
import schedule from 'node-schedule';
import { sendCampaignEmail } from '../utils/sendMail.js';

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Public
export const createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);

    // Schedule email if criteria are met
    if (campaign.for === 'email' && campaign.sendingDateTime) {
      const sendDate = new Date(campaign.sendingDateTime);
      const currentTime = new Date();

      // Only schedule if the date is in the future
      if (sendDate > currentTime) {
        // Fetch the business to retrieve the email address
        const business = await Business.findById(campaign.businessRef);

        if (business && business.email) {
          schedule.scheduleJob(sendDate, async () => {
            try {
              console.log(`Executing scheduled campaign: ${campaign.campaignId}`);
              await sendCampaignEmail({
                to: business.email,
                subject: campaign.messageTitle || 'Notification from Campaign',
                textContent: campaign.messageBody || 'Please view our latest campaign.',
                htmlContent: `<p>${campaign.messageBody}</p>`
              });
            } catch (err) {
              console.error(`Scheduled mail failed for campaign ${campaign.campaignId}:`, err);
            }
          });
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
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    
    res.status(200).json({ message: 'Campaign removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

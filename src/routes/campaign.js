import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignNames,
  getCampaignForSms,
  sendCampaignEmails,
  getEmailStatus,
} from '../controllers/campaignController.js';

const router = express.Router();

// Routes for /api/campaigns/names
router.route('/names')
  .get(getCampaignNames);

// Routes for /api/campaigns/sending-sms/:campaigns_id
router.route('/sending-sms/:campaigns_id')
  .get(getCampaignForSms);

// Routes for /api/campaigns/sending-email/:campaigns_id
router.route('/sending-email/:campaigns_id')
  .post(sendCampaignEmails);

// Routes for /api/campaigns/email-status/:campaigns_id
router.route('/email-status/:campaigns_id')
  .get(getEmailStatus);

// Routes for /api/campaigns
router.route('/')
  .post(createCampaign)
  .get(getCampaigns);

// Routes for /api/campaigns/:id
router.route('/:id')
  .get(getCampaignById)
  .put(updateCampaign)
  .delete(deleteCampaign);

export default router;

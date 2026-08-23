import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '../controllers/campaignController.js';

const router = express.Router();

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

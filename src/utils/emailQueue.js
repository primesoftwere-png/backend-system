import Campaign from '../models/Campaign.js';
import Business from '../models/Business.js';
import { sendThrottledCampaignEmail } from './sendMail.js';

// ============================================================
// Email Queue Processor
// ============================================================
// Sends emails in controlled batches to avoid spam filters:
//   - Batch size: 20 emails per batch
//   - Interval: 10 minutes between batches
//   - Gradually ramps up to avoid sudden volume spikes
//   - Tracks progress in Campaign document (emailSentCount)
// ============================================================

const BATCH_SIZE = 20;             // Max emails per batch
const BATCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes between batches
const DELAY_BETWEEN_EMAILS_MS = 3000;     // 3 seconds between individual emails in a batch

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Process a single batch of emails for a campaign.
 * Returns the number of successfully sent emails in this batch.
 *
 * @param {Object} campaign - The campaign document
 * @param {Array}  businesses - Array of business documents to email in this batch
 * @returns {number} Number of emails successfully sent
 */
const processBatch = async (campaign, businesses) => {
  let sentInBatch = 0;

  for (const business of businesses) {
    if (!business.email) {
      console.log(`[EmailQueue] Skipping business "${business.name}" - no email address`);
      continue;
    }

    try {
      await sendThrottledCampaignEmail({
        to: business.email,
        subject: campaign.emailSubject || 'Notification from Campaign',
        emailBody: campaign.emailBody || campaign.message || 'Please view our latest campaign.',
        businessName: business.name || 'Valued Customer',
      });

      sentInBatch++;

      // Update sent count in DB after each successful send
      await Campaign.findByIdAndUpdate(campaign._id, {
        $inc: { emailSentCount: 1 },
      });

      // Small delay between individual emails to look natural
      if (businesses.indexOf(business) < businesses.length - 1) {
        await sleep(DELAY_BETWEEN_EMAILS_MS);
      }
    } catch (err) {
      console.error(`[EmailQueue] Failed to send to ${business.email}: ${err.message}`);
      // Continue with next email - don't stop the whole batch for one failure
    }
  }

  return sentInBatch;
};

/**
 * Main queue processor - sends all emails for a campaign in throttled batches.
 *
 * @param {string} campaignMongoId - The MongoDB _id of the campaign
 */
export const processEmailQueue = async (campaignMongoId) => {
  try {
    // Fetch the campaign
    const campaign = await Campaign.findById(campaignMongoId);
    if (!campaign) {
      console.error(`[EmailQueue] Campaign not found: ${campaignMongoId}`);
      return;
    }

    // Mark campaign as sending
    await Campaign.findByIdAndUpdate(campaignMongoId, {
      emailStatus: 'sending',
    });

    console.log(`[EmailQueue] Starting email queue for campaign: ${campaign.campaignId}`);

    // Fetch all businesses linked to this campaign that have an email
    const allBusinesses = await Business.find({
      _id: { $in: campaign.businessRef },
      email: { $exists: true, $ne: null, $ne: '' },
    }).lean();

    if (allBusinesses.length === 0) {
      console.log(`[EmailQueue] No businesses with email found for campaign: ${campaign.campaignId}`);
      await Campaign.findByIdAndUpdate(campaignMongoId, {
        emailStatus: 'completed',
        emailTotalCount: 0,
      });
      return;
    }

    // Set total count
    await Campaign.findByIdAndUpdate(campaignMongoId, {
      emailTotalCount: allBusinesses.length,
    });

    console.log(`[EmailQueue] Total emails to send: ${allBusinesses.length} | Batch size: ${BATCH_SIZE}`);

    // Split into batches
    const totalBatches = Math.ceil(allBusinesses.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, allBusinesses.length);
      const batch = allBusinesses.slice(start, end);

      console.log(`[EmailQueue] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} emails)`);

      // Re-fetch campaign to check if it's still in 'sending' status (in case manually cancelled)
      const currentCampaign = await Campaign.findById(campaignMongoId);
      if (!currentCampaign || currentCampaign.emailStatus !== 'sending') {
        console.log(`[EmailQueue] Campaign ${campaign.campaignId} status changed - stopping queue`);
        return;
      }

      await processBatch(campaign, batch);

      // Wait between batches (except after the last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`[EmailQueue] Batch ${batchIndex + 1} done. Waiting ${BATCH_INTERVAL_MS / 60000} minutes before next batch...`);
        await sleep(BATCH_INTERVAL_MS);
      }
    }

    // Mark campaign as completed
    await Campaign.findByIdAndUpdate(campaignMongoId, {
      emailStatus: 'completed',
    });

    console.log(`[EmailQueue] All emails sent for campaign: ${campaign.campaignId}`);
  } catch (error) {
    console.error(`[EmailQueue] Critical error processing campaign ${campaignMongoId}: ${error.message}`);

    // Mark as failed
    await Campaign.findByIdAndUpdate(campaignMongoId, {
      emailStatus: 'failed',
    }).catch(() => {});
  }
};

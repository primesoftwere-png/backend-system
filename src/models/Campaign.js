import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    issues: {
      type: String,
      trim: true,
    },
    campaignName: {
      type: String,
      trim: true,
    },
    campaignId: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      default: Date.now,
    },
    sendingDateTime: {
      type: Date, // Scheduled time and date for the campaign to be sent
    },
    businessRef: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    }],
    message: {
      type: String,
      trim: true,
    },
    emailSubject: {
      type: String,
      trim: true,
    },
    emailBody: {
      type: String,
      trim: true,
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sending', 'completed', 'failed'],
      default: 'pending',
    },
    emailSentCount: {
      type: Number,
      default: 0,
    },
    emailTotalCount: {
      type: Number,
      default: 0,
    },
    emailCronScheduled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

campaignSchema.index({ businessRef: 1 });
campaignSchema.index({ createdAt: -1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;

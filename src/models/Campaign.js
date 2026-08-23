import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    for: {
      type: String,
      enum: ['email', 'mobile_no'],
      required: true,
    },
    numberOfSendingMessage: {
      type: Number,
      default: 0,
    },
    issues: {
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
    businessRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true, // Requires a valid business ID to be passed
    },
    messageTitle: {
      type: String,
      trim: true,
    },
    messageBody: {
      type: String,
      trim: true,
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

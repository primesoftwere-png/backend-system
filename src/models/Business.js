import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    niche: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    isSend: {
      type: Boolean,
      default: false,
    },
    isWeb: {
      type: Boolean,
      default: false,
    },
    webUrl: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

businessSchema.index({ niche: 1 });
businessSchema.index({ isWeb: 1 });
businessSchema.index({ createdAt: -1 });

const Business = mongoose.model('Business', businessSchema);

export default Business;

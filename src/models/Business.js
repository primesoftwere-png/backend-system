import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    // =========================
    // EXISTING BUSINESS FIELDS
    // =========================
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
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    isSend: {
      type: Boolean,
      default: false,
    },

    issendwhatsapp: {
      type: Boolean,
      default: false,
    },

    issendemail: {
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

    businessModel: {
      type: String,
      trim: true,
    },

    // =========================
    // GOOGLE / SOURCE DATA
    // =========================
    googlePlaceId: {
      type: String,
      trim: true,
      index: true,
    },

    googleMapsUrl: {
      type: String,
      trim: true,
    },

    source: {
      type: String,
      trim: true,
    },

    // =========================
    // BUSINESS CLASSIFICATION
    // =========================
    primaryType: {
      type: String,
      trim: true,
    },

    types: {
      type: [String],
      default: [],
    },

    // =========================
    // RATING / REVIEWS
    // =========================
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    // =========================
    // LOCATION
    // =========================
    state: {
      type: String,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    timezone: {
      type: String,
      trim: true,
    },

    // =========================
    // BUSINESS STATUS
    // =========================
    businessStatus: {
      type: String,
      trim: true,
    },

    // =========================
    // PHONE
    // =========================
    internationalPhoneNumber: {
      type: String,
      trim: true,
    },

    // =========================
    // WEBSITE AUDIT
    // =========================
    websiteStatus: {
      type: String,
      trim: true,
    },

    websiteScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    websiteLastChecked: {
      type: Date,
    },

    mobileFriendly: {
      type: Boolean,
    },

    sslEnabled: {
      type: Boolean,
    },

    pageSpeedScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    hasContactForm: {
      type: Boolean,
      default: false,
    },

    hasWhatsApp: {
      type: Boolean,
      default: false,
    },

    hasBooking: {
      type: Boolean,
      default: false,
    },

    hasOnlineStore: {
      type: Boolean,
      default: false,
    },

    // =========================
    // SOCIAL MEDIA
    // =========================
    instagramUrl: {
      type: String,
      trim: true,
    },

    facebookUrl: {
      type: String,
      trim: true,
    },

    linkedinUrl: {
      type: String,
      trim: true,
    },

    youtubeUrl: {
      type: String,
      trim: true,
    },

    // =========================
    // OPENING HOURS
    // =========================
    openingHours: {
      type: mongoose.Schema.Types.Mixed,
    },

    // =========================
    // LEAD SCORING
    // =========================
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    leadPriority: {
      type: String,
      trim: true,
    },

    leadStatus: {
      type: String,
      trim: true,
      default: 'NEW',
    },

    // =========================
    // OUTREACH
    // =========================
    lastContactedAt: {
      type: Date,
    },

    nextFollowUpAt: {
      type: Date,
    },

    contactMethod: {
      type: String,
      trim: true,
    },

    messageStatus: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    messageCount: {
      type: Number,
      default: 0,
    },

    // =========================
    // DEMO WEBSITE
    // =========================
    demoGenerated: {
      type: Boolean,
      default: false,
    },

    demoUrl: {
      type: String,
      trim: true,
    },

    demoStatus: {
      type: String,
      trim: true,
    },

    demoCreatedAt: {
      type: Date,
    },

    // =========================
    // DATA QUALITY
    // =========================
    isVerified: {
      type: Boolean,
      default: false,
    },

    lastVerifiedAt: {
      type: Date,
    },

    // =========================
    // DISCOVERY
    // =========================
    searchQuery: {
      type: String,
      trim: true,
    },

    searchLocation: {
      type: String,
      trim: true,
    },

    discoveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

businessSchema.index({ niche: 1 });
businessSchema.index({ isWeb: 1 });
businessSchema.index({ createdAt: -1 });

businessSchema.index({ googlePlaceId: 1 }, { unique: true, sparse: true });

businessSchema.index({ leadScore: -1 });
businessSchema.index({ leadStatus: 1 });
businessSchema.index({ city: 1, country: 1 });
businessSchema.index({ websiteStatus: 1 });

const Business = mongoose.model('Business', businessSchema);

export default Business;

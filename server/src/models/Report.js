const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['manual', 'upload'],
      required: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    parameters: {
      type: Map,
      of: {
        value: Number,
        unit: String,
        ref_range: String,
      },
      required: true,
    },
    mlResult: {
      flags: {
        type: Map,
        of: String,
      },
      diseaseRisks: {
        type: Map,
        of: Number,
      },
      overallRiskScore: {
        type: Number,
        required: true,
      },
      riskTier: {
        type: String,
        required: true,
      },
      modelVersion: {
        type: String,
        required: true,
      },
    },
    reportDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Report', reportSchema);

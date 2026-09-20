const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true
    },

    userId: {
      type: String,
      required: true
    },

    answer: {
      type: Number,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

verificationSchema.index(
  { chatId: 1, userId: 1 },
  { unique: true }
);

verificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "Verification",
  verificationSchema
);

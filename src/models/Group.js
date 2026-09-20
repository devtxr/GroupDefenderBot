const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true },
  title: { type: String, default: "" },
  antiLink: { type: Boolean, default: true },
  antiProfanity: { type: Boolean, default: true },
  maxWarnings: { type: Number, default: 3 },
  muteMinutes: { type: Number, default: 60 },
  customWords: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);

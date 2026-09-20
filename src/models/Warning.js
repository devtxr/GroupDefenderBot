const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, default: "" },
  count: { type: Number, default: 0 }
}, { timestamps: true });

warningSchema.index({ chatId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Warning", warningSchema);

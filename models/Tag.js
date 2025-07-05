const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tagSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    color: {
      type: String,
      trim: /^#[0-9A-Fa-f]{6}$/,
      default: '#10b981',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure unique tag names per user
tagSchema.index({ name: 1, author: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);

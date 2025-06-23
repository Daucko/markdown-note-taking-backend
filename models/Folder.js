const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    color: {
      type: String,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: '#6366f1',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure unique folder names per user
folderSchema.index({ name: 1, author: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);

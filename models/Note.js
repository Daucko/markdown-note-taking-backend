const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      default: '',
    },
    excerpt: {
      type: String,
      maxlength: 300,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    readingTime: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index for search
noteSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
});

// Compound indexes for efficient queries
noteSchema.index({ author: 1, createdAt: -1 });
noteSchema.index({ author: 1, folder: 1, createdAt: -1 });
noteSchema.index({ author: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);

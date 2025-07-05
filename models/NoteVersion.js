const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const noteVersionSchema = new Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeDescription: {
      type: String,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

noteVersionSchema.index({ noteId: 1, version: -1 });

module.exports = mongoose.model('NoteVersion', noteVersionSchema);

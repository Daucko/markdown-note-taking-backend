const Tag = require('../models/Tag');
const Note = require('../models/Note');

const gatAllTags = async (req, res) => {
  try {
    const tags = Tag.find({ author: req.user._id }).sort({
      usageCount: -1,
      name: 1,
    });

    // Get actual usage counts from notes
    const tagCounts = await Note.aggregate([
      { $match: { author: req.user._id } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]);
  } catch (err) {}
};

module.exports = { getAllTags };

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

    // Update usage counts and add to response
    const tagsWithCounts = await Promise.all(
      (
        await tags
      ).map(async (tag) => {
        const countData = tagCounts.find(
          (c) => c._id.toString() === tag._id.toString()
        );
        const actualCount = countData ? countData.count : 0;

        // Update usage count in database if different
        if (tag.usageCount !== actualCount) {
          await Tag.findByIdAndUpdate(tag._id, { usageCount: actualCount });
        }

        return {
          ...tag.toObject(),
          usageCount: actualCount,
        };
      })
    );

    res.json({ tags: tagsWithCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSingleTag = async (req, res) => {
  try {
    const tag = await Tag.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!tag) return res.status(404).json({ message: 'Tag not found' });

    // Get actual usage count
    const usageCount = await Note.countDocuments({
      author: req.user._id,
      tags: tag._id,
    });

    res.json({
      tag: {
        ...tag.toObject(),
        usageCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllTags, getSingleTag };

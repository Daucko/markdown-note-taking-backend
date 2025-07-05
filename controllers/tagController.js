const Tag = require('../models/Tag');
const Note = require('../models/Note');

const getAllTags = async (req, res) => {
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
          ...tag.toObject({ versionKey: false }),
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
        ...tag.toObject({ versionKey: false }),
        usageCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNewTag = async (req, res) => {
  try {
    const tagData = {
      ...req.body,
      author: req.user._id,
    };

    const tag = await Tag.create(tagData);

    res.status(201).json({
      message: 'Tag created successfully',
      tag: {
        ...tag.toObject({ versionKey: false }),
        usageCount: 0,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Tag name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

const updateTag = async (req, res) => {
  try {
    const tag = await Tag.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    res.json({
      message: 'Tag updated successfully',
      tag,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Tag name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

const deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!tag) return res.status(404).json({ message: 'Tag not found' });

    // Remove tag from all notes
    await Note.updateMany(
      { author: req.user._id, tags: tag._id },
      { $pull: { tags: tag._id } }
    );

    await Tag.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNotesByTag = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const tag = await Tag.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!tag) return res.status(404).json({ message: 'Tag not found' });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notes = await Note.find({
      author: req.user._id,
      tags: tag._id,
    })
      .populate('folder', 'name color')
      .populate('tags', 'name color')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-htmlContent');

    const total = await Note.countDocuments({
      author: req.user._id,
      tags: tag._id,
    });

    res.json({
      tag: tag.toObject({ versionKey: false }),
      notes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotes: total,
        hasNext: skip + notes.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const autoCompleteTagNames = async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const tags = await Tag.find({
      author: req.user._id,
      name: { $regex: query, $options: 'i' },
    })
      .sort({ usageCount: -1, name: 1 })
      .limit(parseInt(limit))
      .select('name color usageCount');

    res.json({ tags });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllTags,
  getSingleTag,
  createNewTag,
  updateTag,
  deleteTag,
  getNotesByTag,
  autoCompleteTagNames,
};

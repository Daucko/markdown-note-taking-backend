const Folder = require('../models/Folder');
const Note = require('../models/Note');

const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ author: req.user._id }).sort({
      position: 1,
      createdAt: 1,
    });

    // Get note counts for each folder
    const folderCounts = await Note.aggregate([
      { $match: { author: req.user._id } },
      { $group: { _id: '$folder', count: { $sum: 1 } } },
    ]);

    // Add note counts to folders
    const foldersWithCounts = folders.map((folder) => {
      const countData = folderCounts.find(
        (c) => c._id && c._id.toString() === folder._id.toString()
      );
      const folderObj = folder.toObject({ versionKey: false }); // Remove __v
      return {
        ...folderObj,
        noteCount: countData ? countData.count : 0,
      };
    });

    res.json({ folders: foldersWithCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSingleFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    // Get note count
    const noteCount = await Note.countDocuments({
      author: req.user._id,
      folder: folder._id,
    });

    res.json({
      folder: {
        ...folder.toObject({ versionKey: false }), // Remove __v
        noteCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNewFolder = async (req, res) => {
  try {
    const folderData = {
      ...req.body,
      author: req.user._id,
    };

    const folder = new Folder(folderData);
    await folder.save();

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        ...folder.toObject({ versionKey: false }), // Remove __v
        noteCount: 0,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const updateFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    res.json({
      message: 'Folder updated successfully',
      folder: folder.toObject({ versionKey: false }), // Remove __v
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Folder name already exists' });

    res.status(500).json({ message: err.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    // Check if folder has notes
    const noteCount = await Note.countDocuments({
      author: req.user._id,
      folder: folder._id,
    });

    if (noteCount > 0) {
      return res.status(400).json({
        message:
          'Cannot delete folder with existing notes. Move or delete notes first.',
        noteCount,
      });
    }

    await Folder.findByIdAndDelete(req.params.id);

    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update folder positions (for drag & drop reordering)
const updateFolderPosition = async (req, res) => {
  try {
    const { folderIds } = req.body;

    if (!Array.isArray(folderIds))
      return res.status(400).json({ message: 'folderIds must be an array' });

    // Update positions
    const updatePromises = folderIds.map((folderId, index) =>
      Folder.findOneAndUpdate(
        { _id: folderId, author: req.user._id },
        { position: index }
      )
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Folder order updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllFolders,
  getSingleFolder,
  createNewFolder,
  updateFolder,
  deleteFolder,
  updateFolderPosition,
};

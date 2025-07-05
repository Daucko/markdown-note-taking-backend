const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');

const Note = require('../models/Note');
const NoteVersion = require('../models/NoteVersion');
const Folder = require('../models/Folder');
const Tag = require('../models/Tag');

const getAllNotes = async (req, res) => {
  try {
    const {
      folder,
      tags,
      pinned,
      archived,
      favorite,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = { author: req.user._id };

    if (folder) query.folder = folder;
    if (tags) query.tags = { $in: tags.split(',') };
    if (pinned !== undefined) query.isPinned = pinned === 'true';
    if (archived !== undefined) query.isArchieved = archived === 'true';
    if (favorite !== undefined) query.isFavorite = favorite === 'true';

    // Sort options
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortOrder };

    // Add pinned notes to top if not specifically filtered
    if (pinned === undefined) {
      sortObj.isPinned = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notes = await Note.find(query)
      .populate('folder', 'name color')
      .populate('tags', 'name color')
      .populate('author', 'username')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-htmlContent'); // Exclude HTML content in list view

    const total = await Note.countDocuments(query);

    // const notes = await Note.find({ user: req.user._id }).sort({
    //   createdAt: -1,
    // });
    res.json({
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
    console.error(err);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
};

const createNewNote = async (req, res) => {
  // check if the note has title
  if (!req.body.title)
    return res.status(400).json({ message: 'Title is required' });
  try {
    const { title, content, tags } = req.body; // Accept tags from request

    // Convert markdown content to HTML
    const parsedContent = marked.parse(content);
    const htmlContent = DOMPurify.sanitize(parsedContent);

    // Generate excerpt
    const plainText = content.replace(/[#*`_~\-\[\]()]/g, '').trim();
    const excerpt = plainText.substring(0, 300);

    // Calculate word count
    const wordCount = plainText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Calculate reading time (average 100 words per minute)
    const readingTime = Math.ceil(wordCount / 200);

    const note = await Note.create({
      title,
      content,
      htmlContent,
      excerpt,
      author: req.user._id,
      wordCount,
      readingTime,
      tags, // Save tags if provided
    });

    // If folder is provided, associate it with the note
    if (req.body.folder) {
      note.folder = req.body.folder;
    } else {
      // If no folder is provided, set a default folder
      note.folder = 'default-folder-id'; // Replace with actual default folder ID
    }

    const noteWithoutSensitiveData = note.toObject();
    delete noteWithoutSensitiveData.author;
    delete noteWithoutSensitiveData.__v;

    res.status(201).json({ note: noteWithoutSensitiveData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create note' });
  }
};

const updateNote = async (req, res) => {
  const noteId = req.params.id;
  const authorId = req.user._id;
  const { title, content, tags } = req.body; // Accept tags from request

  // check if the note has title
  if (!title) return res.status(400).json({ message: `Title is required` });

  try {
    // Find the existing note to check for content changes
    const existingNote = await Note.findOne({
      _id: noteId,
      author: authorId,
    });

    // if the note did not exist
    if (!existingNote) {
      return res
        .status(404)
        .json({ message: 'Note not found or you not have permission' });
    }

    // Save version history if content changed
    if (content && content !== existingNote.content) {
      const noteVersion = new NoteVersion({
        noteId: existingNote._id,
        title: existingNote.title,
        content: existingNote.content,
        version: existingNote.version,
        author: authorId,
        changeDescription: req.body.changeDescription,
      });
      await noteVersion.save();
    }

    // Convert markdown content to HTML
    const parsedContent = marked.parse(content);
    const htmlContent = DOMPurify.sanitize(parsedContent);

    // Generate excerpt
    const plainText = content.replace(/[#*`_~\-\[\]()]/g, '').trim();
    const excerpt = plainText.substring(0, 300);

    // Calculate word count
    const wordCount = plainText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Calculate reading time (average 100 words per minute)
    const readingTime = Math.ceil(wordCount / 200);

    // Update the note with all new fields
    const updateFields = {
      title,
      content,
      htmlContent,
      excerpt,
      wordCount,
      readingTime,
      $inc: { version: 1 }, // Increment version directly in the update
    };
    if (tags) updateFields.tags = tags; // Update tags if provided

    const updatedNote = await Note.findOneAndUpdate(
      {
        _id: noteId,
        author: authorId,
      },
      updateFields,
      { new: true }
    )
      .populate('folder', 'name color')
      .populate('tags', 'name color');

    const noteWithoutSensitiveData = updatedNote.toObject();
    delete noteWithoutSensitiveData.__v;

    res.json({
      message: 'Note updated successfully',
      note: noteWithoutSensitiveData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update note' });
  }
};

const deleteNote = async (req, res) => {
  const noteId = req.params.id;
  const authorId = req.user._id;
  try {
    // Find note and delete it
    const note = await Note.findOneAndDelete({
      _id: noteId,
      author: authorId,
    });
    // If note is not found
    if (!note)
      return res
        .status(404)
        .json({ message: 'Note not found or you do not have permission' });

    // Also delete version history
    await NoteVersion.deleteMany({ noteId: noteId });

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete note' });
  }
};

const getSingleNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    })
      .select('-__v')
      .populate('folder', 'name color')
      .populate('tags', 'name color')
      .populate('author', 'username');

    // If the note is not found
    if (!note) return res.status(404).json({ message: 'Note not found' });

    res.json({ note });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const toggleNotePin = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    // If note is not found
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Toggle the isPinned field
    note.isPinned = !note.isPinned;
    await note.save();

    res.json({
      message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`,
      isPinned: note.isPinned,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const toggleNoteFavoriteStatus = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Toggle the isFavorite field
    note.isFavorite = !note.isFavorite;
    await note.save();

    res.json({
      message: `Note ${
        note.isFavorite ? 'added to' : 'removed from'
      } favorites`,
      isFavorite: note.isFavorite,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const toggleArchiveNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Toggle the isArchived field
    note.isArchived = !note.isArchived;
    await note.save();

    res.json({
      message: `Note ${
        note.isArchived ? 'archived' : 'unarchived'
      } successfully`,
      isArchived: note.isArchived,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNoteVersionHistory = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const versions = await NoteVersion.find({ noteId: req.params.id })
      .populate('author', 'username')
      .sort({ version: -1 })
      .select('-content'); // Exclude content for list view

    res.json({ versions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSpecificVersionContent = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const version = await NoteVersion.findOne({
      nodeId: req.params.id,
      version: req.params.version,
    }).populate('author', 'username');

    if (!version) return res.status(404).json({ message: 'Version not found' });

    res.json({ version });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const duplicateNote = async (req, res) => {
  try {
    const originalNote = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!originalNote)
      return res.status(404).json({ message: 'Note not found' });

    // Create a new note with the same content but a new title
    const duplicateNote = new Note({
      title: `${originalNote.title} (Copy)`,
      content: originalNote.content,
      author: req.user._id,
      folder: originalNote.folder,
      tags: originalNote.tags,
    });

    await duplicateNote.save();
    // Populate references
    await duplicateNote.populate('folder', 'name color');
    await duplicateNote.populate('tags', 'name color');

    res.status(201).json({
      message: 'Note duplicated successfully',
      note: duplicateNote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const downloadNoteAsMarkdown = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const filename = `${note.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowercase()}.md`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(note.content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllNotes,
  createNewNote,
  updateNote,
  deleteNote,
  getSingleNote,
  toggleNotePin,
  toggleNoteFavoriteStatus,
  toggleArchiveNote,
  getNoteVersionHistory,
  getSpecificVersionContent,
  duplicateNote,
  downloadNoteAsMarkdown,
};

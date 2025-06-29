const express = require('express');

const verifyJWT = require('../middleware/verifyJWT');
const tagController = require('../controllers/tagController');

const router = express.Router();

router
  .route('/')
  .get(verifyJWT, tagController.getAllTags)
  .post(verifyJWT, tagController.createNewTag);

router
  .route('/:id')
  .get(verifyJWT, tagController.getSingleTag)
  .patch(verifyJWT, tagController.updateTag)
  .delete(verifyJWT, tagController.deleteTag);

router.get('/:id/notes', verifyJWT, tagController.getNotesByTag);

router.get(
  '/:id/autocomplete/:query',
  verifyJWT,
  tagController.autoCompleteTagNames
);

module.exports = router;

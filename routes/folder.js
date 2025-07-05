const express = require('express');

const verifyJWT = require('../middleware/verifyJWT');
const folderController = require('../controllers/folderController');

const router = express.Router();

router
  .route('/')
  .get(verifyJWT, folderController.getAllFolders)
  .post(verifyJWT, folderController.createNewFolder);

router.put('/reorder', verifyJWT, folderController.updateFolderPosition);

router
  .route('/:id')
  .get(verifyJWT, folderController.getSingleFolder)
  .put(verifyJWT, folderController.updateFolder)
  .delete(verifyJWT, folderController.deleteFolder);

module.exports = router;

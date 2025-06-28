const express = require('express');

const checkIsVerified = require('../middleware/checkIsVerified');
const verifyJWT = require('../middleware/verifyJWT');
const folderController = require('../controllers/folderController');

const router = express.Router();

router
  .route('/')
  .get(verifyJWT, folderController.getAllFolders)
  .post(verifyJWT, folderController.createNewFolder);

router
  .route('/:id')
  .get(verifyJWT, folderController.getSingleFolder)
  .put(verifyJWT, folderController.updateFolder)
  .delete(verifyJWT, folderController.deleteFolder);

router.put('/reorder', verifyJWT, folderController);

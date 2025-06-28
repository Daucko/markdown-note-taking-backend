const express = require('express');

const checkIsVerified = require('../middleware/checkIsVerified');
const verifyJWT = require('../middleware/verifyJWT');
const folderController = require('../controllers/folderController');

const router = express.Router();

router
  .route('/')
  .get(verifyJWT, folderController.getAllFolders)
  .post(verifyJWT, folderController.createNewFolder);

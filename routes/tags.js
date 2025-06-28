const express = require('express');

const verifyJWT = require('../middleware/verifyJWT');
const folderController = require('../controllers/folderController');

const router = express.Router();

const express = require('express')

const checkIsVerified = require('../middleware/checkIsVerified');
const verifyJWT = require('../middleware/verifyJWT');

const router = express.Router()
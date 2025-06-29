const express = require('express');
const Router = express.Router();
const noteController = require('../controllers/noteController');
const verifyJWT = require('../middleware/verifyJWT');

Router.route('/')
  .get(verifyJWT, noteController.getAllNotes)
  .post(verifyJWT, noteController.createNewNote);

Router.route('/:id')
  .get(verifyJWT, noteController.getSingleNote)
  .patch(verifyJWT, noteController.updateNote)
  .delete(verifyJWT, noteController.deleteNote);

module.exports = Router;

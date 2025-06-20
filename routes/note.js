const express = require('express');
const Router = express.Router();
const notesController = require('../controllers/notesController');
const verifyJWT = require('../middleware/verifyJWT');

Router.route('/notes')
  .get(verifyJWT, notesController.getAllNotes)
  .post(verifyJWT, notesController.createNewNote);

Router.route('/note/:id')
  .patch(verifyJWT, notesController.updateNote)
  .delete(verifyJWT, notesController.deleteNote);

module.exports = Router;

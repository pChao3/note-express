const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: String,
  important: Boolean,
  ownerId: String,
  createTime: { type: Date, default: Date.now() },
});

noteSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;

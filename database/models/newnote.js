import mongoose from 'mongoose';
import db from '../dbconnect.js';

const noteSchema = new mongoose.Schema({
  title: String,
  weather: String,
  mood: String,
  tag: String,
  content: String,
  important: Boolean,
  ownerId: String,
  createTime: { type: Date, default: Date.now },
});

noteSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const NewNote = db.model('NewNote', noteSchema);

export default NewNote;

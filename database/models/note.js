require('dotenv').config();
const mongoose = require('mongoose');
const password = process.env.MONGODB_ATLAS;

const url = `mongodb+srv://pinchaolv_db:${password}@cluster0.nkv2mfp.mongodb.net/noteApp?appName=Cluster0`;

mongoose.set('strictQuery', false);
mongoose
  .connect(url)
  .then(res => {
    console.log('contented to mongodb');
  })
  .catch(err => {
    console.log('error content to mongodb', err.message);
  });

const noteSchema = new mongoose.Schema({
  content: String,
  important: Boolean,
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

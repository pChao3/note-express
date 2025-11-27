const express = require('express');
const cors = require('cors');
const Note = require('./models/note.js');

const app = express();
app.use(express.json());

app.use(cors());

app.get('/', (req, res) => {
  res.send('<h1>hello world</h1>');
});

// get all notes
app.get('/api/notes', (req, res) => {
  Note.find({}).then(notes => {
    res.json(notes);
  });
});

// search tagert note
app.get('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  const item = await Note.find({ _id: id });
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});

// add note
app.post('/api/notes', async (req, res) => {
  const data = req.body;
  if (!data.content) {
    return res.status(400).json({ error: 'content is empty' });
  }
  await Note.create({ content: data.content, important: data.important || false });
  res.json({
    isSaved: true,
    msg: 'save successed',
  });
});

// delete note
app.delete('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  await Note.findByIdAndDelete(id);
  res.status(200).json({ isDeleted: true, msg: 'delete successed' });
});

// update note
app.put('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  const item = await Note.find({ _id: id });
  console.log('item', item[0]);

  item[0].important = !item[0].important;
  await Note.findByIdAndUpdate(id, item[0]);
  res.status(200).json({ status: true, msg: 'makepoint successed' });
});

app.listen(3000, () => {
  console.log('server run at http://localhost:3000');
});

const { Router } = require('express');
const Note = require('../../database/models/note.js');

const router = Router();

// get all notes
router.get('/', (req, res) => {
  Note.find({}).then(notes => {
    res.json(notes);
  });
});

// search tagert note
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const item = await Note.find({ _id: id });
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});

// add note
router.post('/', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  await Note.findByIdAndDelete(id);
  res.status(200).json({ isDeleted: true, msg: 'delete successed' });
});

// update note
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const item = await Note.find({ _id: id });
  console.log('item', item[0]);
  item[0].important = !item[0].important;
  await Note.findByIdAndUpdate(id, item[0]);
  res.status(200).json({ status: true, msg: 'makepoint successed' });
});

module.exports = router;

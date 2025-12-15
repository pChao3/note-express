import { Router } from 'express';
import Note from '../../database/models/newnote.js';
import dayjs from 'dayjs';

const router = Router();

// get all notes
router.get('/', (req, res) => {
  const ownerId = req.user.id;

  Note.find({ ownerId })
    .sort({ createTime: -1 })
    .then(notes => {
      res.json({
        status: 'ok',
        data: notes,
      });
    });
});

// get statistic
router.get('/statistic', async (req, res) => {
  const ownerId = req.user.id;
  const notes = await Note.find({ ownerId }).sort({ createTime: -1 });

  const allDays = new Set();
  let unHappy = 0;
  let happy = 0;

  notes.forEach(i => {
    allDays.add(dayjs(i.createTime).format('YYYY-MM-DD'));
    if (i.mood === 'happy') {
      happy++;
    } else {
      unHappy++;
    }
  });
  console.log(allDays.size);
  const lastTime = notes.length > 0 ? notes[0].createTime : null;
  res.json({
    status: 'ok',
    data: { mood: happy >= unHappy ? 'happy' : 'calm', actNum: allDays.size, lastTime: lastTime },
  });
});

// search tagert note
router.get('/:id', async (req, res) => {
  const ownerId = req.user.id;

  const id = req.params.id;
  const item = await Note.find({ _id: id, ownerId });
  if (item) {
    res.json({
      status: 'ok',
      data: item,
    });
  } else {
    res.status(404).end();
  }
});

// add note
router.post('/', async (req, res) => {
  const ownerId = req.user.id;
  const data = req.body;
  if (!data.content) {
    return res.status(400).json({ error: 'content is empty' });
  }
  await Note.create({ ...data, important: data.important || false, ownerId });
  res.json({
    isSaved: true,
    msg: 'save successed',
  });
});

// delete note
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const ownerId = req.user.id;
  await Note.deleteOne({ _id: id, ownerId });
  res.status(200).json({ isDeleted: true, msg: 'delete successed' });
});

// update note
router.put('/:id', async (req, res) => {
  const ownerId = req.user.id;
  const id = req.params.id;
  const item = await Note.find({ _id: id, ownerId });
  console.log('item', item[0]);
  item[0].important = !item[0].important;
  await Note.findByIdAndUpdate(id, item[0]);
  res.status(200).json({ status: true, msg: 'makepoint successed' });
});

export default router;

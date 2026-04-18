import { Router } from 'express';
import Note from '../../database/models/newnote.js';
import dayjs from 'dayjs';
import embed from '../chat/embedding.js';

const router = Router();

// get all notes
router.get('/', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const notes = await Note.find({ ownerId }).sort({ createTime: -1 });
    res.json({ status: 'ok', data: notes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// get statistic
router.get('/statistic', async (req, res) => {
  try {
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

    const lastTime = notes.length > 0 ? notes[0].createTime : null;
    res.json({
      status: 'ok',
      data: { mood: happy >= unHappy ? 'happy' : 'calm', actNum: allDays.size, lastTime },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// search target note
router.get('/:id', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const item = await Note.findOne({ _id: id, ownerId });
    if (item) {
      res.json({ status: 'ok', data: item });
    } else {
      res.status(404).json({ status: 'error', message: 'Note not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// add note
router.post('/', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const data = req.body;
    if (!data.content) {
      return res.status(400).json({ status: 'error', message: 'Content is required' });
    }
    const info = { ...data, important: data.important || false, ownerId };
    const contentEmbedding = await embed(JSON.stringify(info));
    await Note.create({ ...info, contentEmbedding });
    res.json({ isSaved: true, message: 'Note saved successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const result = await Note.deleteOne({ _id: id, ownerId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }
    res.json({ isDeleted: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// update note
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const { id } = req.params;
    const ownerId = req.user.id;
    const contentEmbedding = await embed(JSON.stringify(data));
    const note = await Note.findOneAndUpdate(
      { _id: id, ownerId },
      { ...data, contentEmbedding },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }
    res.json({ status: 'ok', message: 'Note updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;

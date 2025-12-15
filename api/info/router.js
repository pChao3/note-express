import { Router } from 'express';
import Note from '../../database/models/newnote.js';
import dayjs from 'dayjs';

const router = Router();

router.post('/searchNotes', async (req, res) => {
  const ownerId = req.user.id;
  const params = req.body;
  console.log(params);
  const notes = await Note.find({ ownerId, ...params });
  res.json({
    status: 'ok',
    data: notes,
  });
  console.log(notes);
});

router.get('/allMonthes', async (req, res) => {
  const ownerId = req.user.id;
  const notes = await Note.find({ ownerId }, { createTime: 1, _id: 0 }).sort({ createTime: -1 });
  const monthes = new Set();

  notes.forEach(i => {
    const monthKey = dayjs(i.createTime).format('YYYY-MM');
    monthes.add(monthKey);
  });
  console.log(monthes);

  res.json({
    status: 'ok',
    data: Array.from(monthes),
    /* 示例数据格式: [ "2025-12", "2025-11", "2024-10" ] */
  });
});

router.get('/moods', async (req, res) => {
  const ownerId = req.user.id;
  const allMoods = await Note.find({ ownerId }, 'mood');
  const moods = new Set();
  allMoods.forEach(i => moods.add(i.mood));
  res.json({
    status: 'ok',
    moods: Array.from(moods),
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
  const lastTime = notes.length > 0 ? notes[0].createTime : null;
  res.json({
    status: 'ok',
    data: { mood: happy >= unHappy ? 'happy' : 'calm', actNum: allDays.size, lastTime: lastTime },
  });
});

export default router;

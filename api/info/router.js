import { Router } from 'express';
import Note from '../../database/models/newnote.js';
import User from '../../database/models/user.js';
import dayjs from 'dayjs';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userInfo } from 'os';

const router = Router();

// router.post('/searchNotes', async (req, res) => {
//   const ownerId = req.user.id;
//   const params = req.body;
//   const tag = params.tag;
//   delete params.tag;
//   console.log('params', params);
//   const notes = await Note.find({ ownerId, ...params });
//   const data = tag ? notes.filter(i => i.tag.includes(tag)) : notes;
//   res.json({
//     status: 'ok',
//     data: data,
//   });
// });
router.post('/searchNotes', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { month, tag, ...otherParams } = req.body;
    const query = { ownerId };
    if (month) {
      const startOfMonth = dayjs(month).startOf('month').toDate();
      const endOfMonth = dayjs(month).endOf('month').toDate();
      query.createTime = {
        $gte: startOfMonth,
        $lte: endOfMonth,
      };
    }
    if (tag) {
      // 假设数据库中的 tag 是一个数组，使用 $in 或直接匹配
      // 如果需要模糊匹配可以使用: query.tag = { $regex: tag, $options: 'i' };
      query.tag = { $regex: tag, $options: 'i' };
    }

    Object.keys(otherParams).forEach(key => {
      if (otherParams[key] !== '' && otherParams[key] !== null && otherParams[key] !== undefined) {
        query[key] = otherParams[key];
      }
    });
    console.log('params', query);
    const notes = await Note.find(query).sort({ createTime: -1 });

    res.json({
      status: 'ok',
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    console.error('查询失败:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
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

router.post('/getNotesNum', async (req, res) => {
  const { type, time } = req.body;
  const start = dayjs(time).startOf(type).toDate();
  const end = dayjs(time).endOf(type).toDate();

  const stats = await Note.aggregate([
    // 1. 筛选：当前用户 + 指定月份范围
    {
      $match: {
        ownerId: req.user.id,
        createTime: { $gte: start, $lte: end },
      },
    },
    // 2. 分组：按日期字符串（YYYY-MM-DD）进行分组并计数
    {
      $group: {
        _id: {
          $dateToString: { format: type === 'month' ? '%Y-%m-%d' : '%Y-%m', date: '$createTime' },
        },
        count: { $sum: 1 }, // 每一条记录记为 1
      },
    },
    // 3. 排序：按日期升序排列（可选）
    {
      $sort: { _id: 1 },
    },
  ]);

  // 格式化输出：将数据转化为更方便前端使用的对象格式
  // 结果示例: { "2025-12-01": 2, "2025-12-05": 1 }
  console.log(stats);
  const result = {};
  stats.forEach(item => {
    result[item._id] = item.count;
  });
  res.json({
    status: 'ok',
    data: result,
  });
});

router.post('/getNotesByDate', async (req, res) => {
  const { type, time } = req.body;
  const format = type === 'month' ? type : 'day';

  const start = dayjs(time).startOf(format).toDate();
  const end = dayjs(time).endOf(format).toDate();
  console.log(format, start, end);

  const notes = await Note.find({
    ownerId: req.user.id,
    createTime: { $gte: start, $lte: end },
  }).sort({ createTime: -1 });

  res.json({ status: 'ok', data: notes });
});

router.get('/by-date/:date', async (req, res) => {
  const { date } = req.params; // 格式: "2023-12-01"
  const start = dayjs(date).startOf('day').toDate();
  const end = dayjs(date).endOf('day').toDate();

  const notes = await Note.find({
    ownerId: req.user.id,
    createTime: { $gte: start, $lte: end },
  }).sort({ createTime: -1 });

  res.json({ status: 'ok', data: notes });
});

const uploadDir = 'public/uploads/avatars';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// 1. 配置 Multer 存储 (存入服务器公共目录)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/avatars'); // 确保该文件夹已存在
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名: 用户ID + 时间戳
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 限制 2MB
});

router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: '请选择要上传的图片' });
    }

    // 生成可访问的 URL 路径
    // 注意：这里取决于你在 app.js 中如何配置 express.static
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 更新数据库中的用户头像字段
    await User.findByIdAndUpdate(req.user.id, { profile: avatarUrl });

    res.json({
      status: 'ok',
      message: '头像上传成功',
      url: avatarUrl, // 返回给前端用于即时展示
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: '服务器上传失败' });
  }
});

router.get('/getUserInfo', async (req, res) => {
  const data = await User.findById(req.user.id).select('nickName email profile');
  res.json({
    status: 'ok',
    userInfo: data,
  });
});

// set userInfo
router.post('/setUserInfo', async (req, res) => {
  const { nickName } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { nickName },
      { new: true } // 返回更新后的文档
    );

    res.json({
      status: 'ok',
      data: {
        nickName: user.nickName,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '更新资料失败' });
  }
});
export default router;

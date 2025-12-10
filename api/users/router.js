const { Router } = require('express');
const User = require('../../database/models/user.js');

const router = new Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const target = await User.find({ username, password });
  console.log(target);
  if (target.length) {
    res.json({
      msg: 'login success!',
      status: 200,
      data: true,
    });
  } else {
    res.status(200).json({ msg: 'has not registry', data: false });
  }
});

router.post('/registry', async (req, res) => {
  console.log('req', req);
  const { username, password } = req.body;
  await User.create({ username, password });
  res.json({
    msg: 'success',
    status: 200,
    data: 'ok',
  });
});

module.exports = router;

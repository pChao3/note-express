const { Router } = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../database/models/user.js');

const router = new Router();
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  console.log(user);
  if (user) {
    const token = jwt.sign(
      { id: user._id, email: user.email, password: user.password }, // payload
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      msg: 'login success!',
      status: 200,
      data: true,
      token,
    });
  } else {
    res.status(200).json({ msg: 'has not registry', data: false });
  }
});

router.post('/registry', async (req, res) => {
  console.log('req', req);
  const { email, password } = req.body;
  const item = await User.findOne({ email });
  if (item) return res.status(400).json({ message: 'Email exists' });
  await User.create({ email, password });
  res.json({
    msg: 'success',
    status: 200,
    data: 'ok',
  });
});

module.exports = router;

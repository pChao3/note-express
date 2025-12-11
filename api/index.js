// src/app.ts
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('../middleware/errorHandler');

const notes = require('./notes/router');
const users = require('./users/router');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 挂载路由（推荐用 index 自动注册）
// app.use('/api/auth', require('./api/auth/auth.router').default);
app.use('/api/users', users);
app.use('/api/notes', notes);

// 404 + 统一错误处理要放在最后
// app.use('/', (req, res) => res.status(404).json({ message: 'Not Found' }));
app.use(errorHandler);

module.exports = app;

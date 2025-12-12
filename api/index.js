import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from '../database/dbconnect.js';
import errorHandler from '../middleware/errorHandler.js';
import auth from '../middleware/auth.js';

import notes from './notes/router.js';
import users from './users/router.js';

connectDB();
const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 挂载路由（推荐用 index 自动注册）
// app.use('/api/auth', require('./api/auth/auth.router').default);
app.use('/api/users', users);
app.use('/api/notes', auth, notes);

// 404 + 统一错误处理要放在最后
// app.use('/', (req, res) => res.status(404).json({ message: 'Not Found' }));
app.use(errorHandler);
app.listen(3000, () => {
  console.log('start!!');
});
export default app;

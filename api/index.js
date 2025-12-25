import 'dotenv/config';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from '../database/dbconnect.js';
import errorHandler from '../middleware/errorHandler.js';
import cleanQueryMiddleware from '../middleware/cleanQuery.js';
import auth from '../middleware/auth.js';

import notes from './notes/router.js';
import users from './users/router.js';
import infos from './info/router.js';
import { fileURLToPath } from 'url';

// 获取当前文件的绝对路径
const __filename = fileURLToPath(import.meta.url);

// 获取当前文件所在的目录路径
const __dirname = path.dirname(__filename);

connectDB();
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cleanQueryMiddleware);
// 开放 public 文件夹，使其可以直接通过 URL 访问
app.use(express.static(path.join(__dirname, '../public')));

// 挂载路由（推荐用 index 自动注册）
// app.use('/api/auth', require('./api/auth/auth.router').default);
app.use('/api/users', users);
app.use('/api/notes', auth, notes);
app.use('/api/infos', auth, infos);

// 404 + 统一错误处理要放在最后
// app.use('/', (req, res) => res.status(404).json({ message: 'Not Found' }));
app.use(errorHandler);

export default app;

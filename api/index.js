import 'dotenv/config';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import errorHandler from '../middleware/errorHandler.js';
import cleanQueryMiddleware from '../middleware/cleanQuery.js';
import auth from '../middleware/auth.js';

import notes from './notes/router.js';
import users from './users/router.js';
import infos from './info/router.js';
import chat from './chat/index.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many requests, please try again later' },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cleanQueryMiddleware);
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/users', limiter, users);
app.use('/api/notes', auth, limiter, notes);
app.use('/api/infos', auth, limiter, infos);
app.use('/chat', auth, limiter, chat);

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

app.use(errorHandler);

export default app;

import mongoose from 'mongoose';

const db = mongoose.createConnection(process.env.MONGO_URL);
db.on('connected', () => {
  console.log('MongoDB connection success!');
});

db.on('error', () => {
  console.error('MongoDB connection failed!');
});

export default db;

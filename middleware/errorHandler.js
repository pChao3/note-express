const errorHandler = (req, res, next) => {
  res.status(500).json({ status: 'error', message: '服务器错误' });
  next();
};

export default errorHandler;

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
};

export default errorHandler;

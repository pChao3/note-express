const errorHandler = (req, res, next) => {
  console.log('errorHandler');
  next();
};

module.exports = errorHandler;

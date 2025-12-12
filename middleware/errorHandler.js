const errorHandler = (req, res, next) => {
  console.log('errorHandler');
  next();
};

export default errorHandler;

/**
 * Express 中间件，清理 req.query 中的空值参数。
 */
const cleanQueryMiddleware = (req, res, next) => {
  const cleanedQuery = {};
  for (const key in req.body) {
    const value = req.body[key];
    // 检查值是否为 null, undefined, 或空字符串
    if (value !== null && value !== undefined && value !== '') {
      cleanedQuery[key] = value;
    }
  }
  req.body = cleanedQuery;
  next();
};

export default cleanQueryMiddleware;

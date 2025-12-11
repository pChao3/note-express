const app = require('./api/index');
const serverless = require('@vendia/serverless-express');

module.exports = serverless({ app });

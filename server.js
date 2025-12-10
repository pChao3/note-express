// src/server.ts
const app = require('./app');
const { createServer } = require('http');

const PORT = 3000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  server.close(() => console.log('Process terminated'));
});

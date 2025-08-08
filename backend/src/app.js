import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initDatabase } from './database/init.js';
import participantRoutes from './routes/participants.js';
import awardRoutes from './routes/awards.js';
import lotteryRoutes from './routes/lottery.js';

const app = express();
const PORT = process.env.PORT || 8080;

// 性能监控中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // 记录超过1秒的慢请求
      console.log(`慢请求警告: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
});
// 中间件
app.use(helmet({
  contentSecurityPolicy: false // Vercel 部署时可能需要
}));
// CORS 配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://solo-lottery.vercel.app', 'https://*.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// 路由
app.use('/api/participants', participantRoutes);
app.use('/api/awards', awardRoutes);
app.use('/api/lottery', lotteryRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API 状态检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running', timestamp: new Date().toISOString() });
});
// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
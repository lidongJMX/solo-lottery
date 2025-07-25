import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/lottery.db');

// 创建数据库连接
export const db = new sqlite3.Database(dbPath);

// 将回调函数转换为Promise
export const dbRun = promisify(db.run.bind(db));
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));

// 初始化数据库
export async function initDatabase() {
  try {
    // 创建参与者表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        department TEXT,
        phone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建奖品表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS prizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        name TEXT NOT NULL,
        image TEXT,
        total_count INTEGER NOT NULL DEFAULT 1,
        remaining_count INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建中奖记录表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS winners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER NOT NULL,
        prize_id INTEGER NOT NULL,
        draw_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participant_id) REFERENCES participants (id),
        FOREIGN KEY (prize_id) REFERENCES prizes (id)
      )
    `);

    // 插入默认奖品数据
    const defaultPrizes = [
      {
        level: '一等奖',
        name: '小天鹅 LittleSwan 洗烘套装',
        image: 'https://ai-public.mastergo.com/ai/img_res/304a8126d488fa893ca027a2c8de9704.jpg',
        total_count: 1,
        remaining_count: 1
      },
      {
        level: '二等奖',
        name: '戴森吸尘器',
        image: 'https://ai-public.mastergo.com/ai/img_res/52b3e08599c214acc6802d5f6fbb8503.jpg',
        total_count: 2,
        remaining_count: 2
      },
      {
        level: '三等奖',
        name: '华为智能手表',
        image: 'https://ai-public.mastergo.com/ai/img_res/37bc491a791bc693235bc252a0725d3f.jpg',
        total_count: 5,
        remaining_count: 5
      }
    ];

    for (const prize of defaultPrizes) {
      const existing = await dbGet('SELECT id FROM prizes WHERE level = ? AND name = ?', [prize.level, prize.name]);
      if (!existing) {
        await dbRun(
          'INSERT INTO prizes (level, name, image, total_count, remaining_count) VALUES (?, ?, ?, ?, ?)',
          [prize.level, prize.name, prize.image, prize.total_count, prize.remaining_count]
        );
      }
    }

    // 插入默认参与者数据
    const defaultParticipants = [
      '张雨晨', '李思成', '王梓萱', '陈宇航', '刘欣怡',
      '黄子豪', '周美玲', '吴承翰', '赵雅婷', '孙浩然',
      '徐子涵', '郭雨菲', '何俊杰', '马思琪', '朱天宇',
      '杨雨欣', '林子轩', '范思涵', '金子轩', '唐嘉怡'
    ];

    for (const name of defaultParticipants) {
      const existing = await dbGet('SELECT id FROM participants WHERE name = ?', [name]);
      if (!existing) {
        await dbRun('INSERT INTO participants (name) VALUES (?)', [name]);
      }
    }

    console.log('数据库表创建成功，默认数据插入完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则初始化数据库
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().then(() => {
    console.log('数据库初始化完成');
    process.exit(0);
  }).catch((error) => {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  });
}
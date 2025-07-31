import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/lottery.db');

// 创建数据库连接
export const db = new sqlite3.Database(dbPath);

// 优化数据库性能配置
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL'); // 启用WAL模式提升并发性能
  db.run('PRAGMA synchronous = NORMAL'); // 平衡性能和数据安全
  db.run('PRAGMA cache_size = 10000'); // 增加缓存大小
  db.run('PRAGMA temp_store = MEMORY'); // 临时数据存储在内存中
  db.run('PRAGMA foreign_keys = ON'); // 启用外键约束
});

// 将回调函数转换为Promise
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));

// 事务处理函数
export const dbTransaction = async (operations) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        const executeOperations = async () => {
          try {
            const results = [];
            for (const operation of operations) {
              const result = await dbRun(operation.sql, operation.params);
              results.push(result);
            }
            
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                reject(commitErr);
              } else {
                resolve(results);
              }
            });
          } catch (error) {
            db.run('ROLLBACK', (rollbackErr) => {
              if (rollbackErr) {
                console.error('回滚失败:', rollbackErr);
              }
              reject(error);
            });
          }
        };
        
        executeOperations();
      });
    });
  });
};

// 初始化数据库
export async function initDatabase() {
  try {
    // 禁用外键约束检查，方便表结构的创建和修改
    await dbRun('PRAGMA foreign_keys = false');

    // 管理员表：存储系统管理员账户信息
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" VARCHAR(255) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        UNIQUE ("username" ASC)
      )
    `);

    // 奖项表：存储所有可抽取的奖项信息
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "Award" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "count" INTEGER NOT NULL,
        "remaining_count" INTEGER NOT NULL,
        "level" INTEGER NOT NULL,
        "draw_count" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 轮次表：存储抽奖活动的轮次信息
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "Epoch" (
        "epoch_id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "epoch" INTEGER NOT NULL DEFAULT 0,
        "status" TINYINT NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 参与者表：存储参与抽奖的人员信息
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "Participant" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" VARCHAR(255) NOT NULL,
        "user_id" VARCHAR(255),
        "department" VARCHAR(255),
        "phone" VARCHAR(255),
        "email" VARCHAR(255),
        "weight" FLOAT NOT NULL DEFAULT '100',
        "has_won" TINYINT(1) NOT NULL DEFAULT 0,
        "win_count" INTEGER NOT NULL DEFAULT 0,
        "high_award_level" INTEGER NOT NULL DEFAULT 100,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 中奖记录表：存储所有中奖信息
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "Winner" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "participant_id" INTEGER NOT NULL,
        "award_id" INTEGER NOT NULL,
        "epoch" INTEGER NOT NULL DEFAULT 0,
        "draw_time" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("participant_id") REFERENCES "Participant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
        FOREIGN KEY ("award_id") REFERENCES "Award" ("id") ON DELETE NO ACTION ON UPDATE CASCADE
      )
    `);

    // 多次中奖控制配置表：存储多次中奖控制策略的配置参数
    await dbRun(`
      CREATE TABLE IF NOT EXISTS "MultiWinConfig" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "threeWinPercentage" INTEGER NOT NULL DEFAULT 5,
        "twoWinPercentage" INTEGER NOT NULL DEFAULT 10,
        "minEpochInterval" INTEGER NOT NULL DEFAULT 3,
        "enabled" TINYINT(1) NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 启用外键约束检查
    await dbRun('PRAGMA foreign_keys = true');

    // 插入默认数据（仅在表为空时插入）
    const currentTime = new Date().toISOString();
    
    // 优化：一次查询检查所有表的数据存在性
    const tableChecks = await dbAll(`
      SELECT 'Admin' as table_name, COUNT(*) as count FROM "Admin"
      UNION ALL
      SELECT 'Epoch' as table_name, COUNT(*) as count FROM "Epoch"
      UNION ALL
      SELECT 'Award' as table_name, COUNT(*) as count FROM "Award"
      UNION ALL
      SELECT 'Participant' as table_name, COUNT(*) as count FROM "Participant"
      UNION ALL
      SELECT 'Winner' as table_name, COUNT(*) as count FROM "Winner"
      UNION ALL
      SELECT 'MultiWinConfig' as table_name, COUNT(*) as count FROM "MultiWinConfig"
    `);

    const tableCounts = {};
    tableChecks.forEach(check => {
      tableCounts[check.table_name] = check.count;
    });
    
    // 检查Admin表是否有数据
    if (tableCounts.Admin === 0) {
      const defaultAdmin = {
        username: 'admin',
        password: 'admin123', // 实际应用中应该加密存储
        createdAt: currentTime,
        updatedAt: currentTime
      };
      
      await dbRun(
        'INSERT INTO "Admin" ("username", "password", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)',
        [defaultAdmin.username, defaultAdmin.password, defaultAdmin.createdAt, defaultAdmin.updatedAt]
      );
      console.log('默认管理员数据插入完成');
    } else {
      console.log('Admin表中已有数据，跳过默认数据插入');
    }

    // 检查Epoch表是否有数据
    if (tableCounts.Epoch === 0) {
      const defaultEpoch = {
        epoch: 1,
        status: 1,
        createdAt: currentTime,
        updatedAt: currentTime
      };
      
      await dbRun(
        'INSERT INTO "Epoch" ("epoch", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)',
        [defaultEpoch.epoch, defaultEpoch.status, defaultEpoch.createdAt, defaultEpoch.updatedAt]
      );
      console.log('默认轮次数据插入完成');
    } else {
      console.log('Epoch表中已有数据，跳过默认数据插入');
    }
 
    // 检查Award表是否有数据
    if (tableCounts.Award === 0) {
      const defaultAwards = [
        {
          name: '一等奖',
          description: '小天鹅洗衣机',
          count: 50,
          remaining_count: 50,
          level: 1,
          draw_count: 5,
          createdAt: currentTime,
          updatedAt: currentTime
        },
        {
          name: '二等奖',
          description: '戴森吹风机',
          count: 100,
          remaining_count: 100,
          level: 2,
          draw_count: 10,
          createdAt: currentTime,
          updatedAt: currentTime
        },
        {
          name: '三等奖',
          description: '智能运动手表，健康生活伴侣',
          count: 150,
          remaining_count: 150,
          level: 3,
          draw_count: 15,
          createdAt: currentTime,
          updatedAt: currentTime
        }
      ];

      // 优化：批量插入奖项数据
      const awardPlaceholders = defaultAwards.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const awardValues = [];
      
      for (const award of defaultAwards) {
        awardValues.push(
          award.name, award.description, award.count, award.remaining_count, 
          award.level, award.draw_count, award.createdAt, award.updatedAt
        );
      }
      
      await dbRun(
        `INSERT INTO "Award" ("name", "description", "count", "remaining_count", "level", "draw_count", "createdAt", "updatedAt") VALUES ${awardPlaceholders}`,
        awardValues
      );
      console.log('默认奖项数据批量插入完成');
    } else {
      console.log('Award表中已有数据，跳过默认数据插入');
    }

    // 检查Participant表是否有数据
    if (tableCounts.Participant === 0) {
      const defaultParticipants = [
        '张雨晨', '李思成', '王梓萱', '陈宇航', '刘欣怡',
        '黄子豪', '周美玲', '吴承翰', '赵雅婷', '孙浩然',
        '徐子涵', '郭雨菲', '何俊杰', '马思琪', '朱天宇',
        '杨雨欣', '林子轩', '范思涵', '金子轩', '唐嘉怡'
      ];

      // 优化：批量插入参与者数据
      const participantPlaceholders = defaultParticipants.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const participantValues = [];
      
      for (const name of defaultParticipants) {
        participantValues.push(name, null, '技术部', 100, 0, 0, 100, currentTime, currentTime);
      }
      
      await dbRun(
        `INSERT INTO "Participant" ("name", "user_id", "department", "weight", "has_won", "win_count", "high_award_level", "createdAt", "updatedAt") VALUES ${participantPlaceholders}`,
        participantValues
      );
      console.log('默认参与者数据批量插入完成');
    } else {
      console.log('Participant表中已有数据，跳过默认数据插入');
    }
    
    // 检查Winner表是否有数据（通常为空，但为了完整性也检查）
    if (tableCounts.Winner === 0) {
      console.log('Winner表为空，无需插入默认数据');
    } else {
      console.log('Winner表中已有数据');
    }
    
    // 检查MultiWinConfig表是否有数据
    if (tableCounts.MultiWinConfig === 0) {
      await dbRun(
        `INSERT INTO "MultiWinConfig" ("threeWinPercentage", "twoWinPercentage", "minEpochInterval", "enabled", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)`,
        [5, 10, 3, 1, currentTime, currentTime]
      );
      console.log('默认多次中奖控制配置插入完成');
    } else {
      console.log('MultiWinConfig表中已有数据，跳过默认数据插入');
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
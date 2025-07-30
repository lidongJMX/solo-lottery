import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { dbAll, dbGet, dbRun, dbTransaction } from '../database/init.js';

const router = express.Router();

// 配置multer用于文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel (.xlsx, .xls) 和 CSV 文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 获取所有参与者
router.get('/', async (req, res) => {
  try {
    const participants = await dbAll('SELECT * FROM Participant ORDER BY id');
    res.json(participants);
  } catch (error) {
    console.error('获取参与者列表失败:', error);
    res.status(500).json({ error: '获取参与者列表失败' });
  }
});

// 获取可参与抽奖的人员（未中奖的）
router.get('/available', async (req, res) => {
  try {
    const availableParticipants = await dbAll(`
      SELECT p.* FROM Participant p
      WHERE p.id NOT IN (
        SELECT DISTINCT participant_id FROM Winner
      )
      ORDER BY p.name
    `);
    res.json(availableParticipants);
  } catch (error) {
    console.error('获取可参与抽奖人员失败:', error);
    res.status(500).json({ error: '获取可参与抽奖人员失败' });
  }
});

// 获取参与者姓名列表（为前端抽奖滚动提供数据）
router.get('/names', async (req, res) => {
  try {
    const participants = await dbAll(`
      SELECT name FROM Participant
      WHERE id NOT IN (
        SELECT DISTINCT participant_id FROM Winner
      )
      ORDER BY id
    `);
    const names = participants.map(p => p.name);
    res.json(names);
  } catch (error) {
    console.error('获取参与者姓名失败:', error);
    res.status(500).json({ error: '获取参与者姓名失败' });
  }
});

// 添加参与者
router.post('/', async (req, res) => {
  try {
    const { name, department, phone, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '姓名不能为空' });
    }

    // 检查是否已存在
    const existing = await dbGet('SELECT id FROM Participant WHERE name = ?', [name]);
    if (existing) {
      return res.status(400).json({ error: '该参与者已存在' });
    }

    const currentTime = new Date().toISOString();
    
    // 使用事务添加参与者
    const results = await dbTransaction([
      {
        sql: 'INSERT INTO Participant (name, user_id, department, phone, email, weight, has_won, win_count, high_award_level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [name, null, department || null, phone || null, email || null, 1.0, 0, 0, 100, currentTime, currentTime]
      }
    ]);

    const newParticipant = await dbGet('SELECT * FROM Participant WHERE id = ?', [results[0].lastID]);
    res.status(201).json(newParticipant);
  } catch (error) {
    console.error('添加参与者失败:', error);
    res.status(500).json({ error: '添加参与者失败' });
  }
});

// 更新参与者信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: '姓名不能为空' });
    }

    // 检查参与者是否存在
    const existing = await dbGet('SELECT id FROM Participant WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '参与者不存在' });
    }

    const currentTime = new Date().toISOString();
    
    // 使用事务更新参与者
    await dbTransaction([
      {
        sql: 'UPDATE Participant SET name = ?, department = ?, phone = ?, email = ?, updatedAt = ? WHERE id = ?',
        params: [name, department, phone, email, currentTime, id]
      }
    ]);

    const updatedParticipant = await dbGet('SELECT * FROM Participant WHERE id = ?', [id]);
    res.json(updatedParticipant);
  } catch (error) {
    console.error('更新参与者失败:', error);
    res.status(500).json({ error: '更新参与者失败' });
  }
});

// 批量清空所有参与者（必须放在 /:id 路由之前）
router.delete('/clear-all', async (req, res) => {
  try {
    const { force = false } = req.body;

    // 检查是否有已中奖的参与者
    const winnersCount = await dbGet('SELECT COUNT(*) as count FROM Winner');
    
    if (winnersCount.count > 0 && !force) {
      return res.status(400).json({ 
        error: '存在已中奖的参与者，无法清空名单', 
        hasWinners: true,
        winnersCount: winnersCount.count
      });
    }

    // 获取参与者数量
    const participantsCount = await dbGet('SELECT COUNT(*) as count FROM Participant');
    
    // 使用事务确保数据一致性
    const clearOperations = [];
    
    // 如果强制清空，先删除所有中奖记录
    if (force && winnersCount.count > 0) {
      clearOperations.push({
        sql: 'DELETE FROM Winner',
        params: []
      });
      
      // 重置所有奖项的剩余数量
      clearOperations.push({
        sql: 'UPDATE Award SET remaining_count = count',
        params: []
      });
    }

    // 删除所有参与者
    clearOperations.push({
      sql: 'DELETE FROM Participant',
      params: []
    });
    
    const results = await dbTransaction(clearOperations);
    const deletedCount = results[results.length - 1].changes || 0;
    
    res.json({ 
      message: '清空成功',
      deletedCount: deletedCount,
      winnersCleared: force && winnersCount.count > 0 ? winnersCount.count : 0
    });
  } catch (error) {
    console.error('清空参与者名单失败:', error);
    res.status(500).json({ error: '清空失败: ' + error.message });
  }
});

// 删除参与者
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查参与者是否存在
    const existing = await dbGet('SELECT id FROM Participant WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '参与者不存在' });
    }

    // 检查是否已中奖
    const hasWon = await dbGet('SELECT id FROM Winner WHERE participant_id = ?', [id]);
    if (hasWon) {
      return res.status(400).json({ error: '该参与者已中奖，无法删除' });
    }

    await dbRun('DELETE FROM Participant WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除参与者失败:', error);
    res.status(500).json({ error: '删除参与者失败' });
  }
});

// 批量导入参与者
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要导入的文件' });
    }

    let participants = [];
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // 解析文件
    if (fileName.endsWith('.csv')) {
      // 解析CSV文件
      const csvData = fileBuffer.toString('utf8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV文件格式错误，至少需要包含标题行和一行数据' });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // 检查必需的列
      const nameIndex = headers.findIndex(h => h === 'name' || h === '姓名');
      const userIdIndex = headers.findIndex(h => h === 'user_id' || h === '工号' || h === '员工号');
      const departmentIndex = headers.findIndex(h => h === 'department' || h === '部门');
      
      if (nameIndex === -1) {
        return res.status(400).json({ error: '文件中必须包含 "name" 或 "姓名" 列' });
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= headers.length && values[nameIndex]) {
          participants.push({
            name: values[nameIndex],
            user_id: userIdIndex !== -1 ? values[userIdIndex] : null,
            department: departmentIndex !== -1 ? values[departmentIndex] : null
          });
        }
      }
    } else {
      // 解析Excel文件
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ error: 'Excel文件中没有数据' });
      }

      // 检查必需的列（支持中英文列名）
      const firstRow = jsonData[0];
      const nameKey = Object.keys(firstRow).find(key => 
        key === 'name' || key === '姓名' || key.toLowerCase() === 'name'
      );
      const userIdKey = Object.keys(firstRow).find(key => 
        key === 'user_id' || key === '工号' || key === '员工号' || key.toLowerCase() === 'user_id'
      );
      const departmentKey = Object.keys(firstRow).find(key => 
        key === 'department' || key === '部门' || key.toLowerCase() === 'department'
      );

      if (!nameKey) {
        return res.status(400).json({ error: 'Excel文件中必须包含 "name"、"姓名" 或类似的列名' });
      }

      participants = jsonData.map(row => ({
        name: row[nameKey],
        user_id: userIdKey ? row[userIdKey] : null,
        department: departmentKey ? row[departmentKey] : null
      })).filter(p => p.name); // 过滤掉姓名为空的记录
    }

    if (participants.length === 0) {
      return res.status(400).json({ error: '文件中没有有效的参与者数据' });
    }

    // 检查重复姓名
    const existingNames = await dbAll('SELECT name FROM Participant WHERE name IN (' + participants.map(() => '?').join(',') + ')', participants.map(p => p.name));
    const existingNameSet = new Set(existingNames.map(row => row.name));
    
    // 过滤掉已存在的参与者
    const newParticipants = participants.filter(p => !existingNameSet.has(p.name));
    const duplicateCount = participants.length - newParticipants.length;
    
    if (newParticipants.length === 0) {
      return res.json({
        message: '导入完成',
        total: participants.length,
        success: 0,
        duplicates: duplicateCount,
        errors: 0,
        errorDetails: duplicateCount > 0 ? ['所有参与者都已存在'] : []
      });
    }

    // 使用事务批量插入数据库
    const currentTime = new Date().toISOString();
    const insertOperations = newParticipants.map(participant => ({
      sql: 'INSERT INTO Participant (name, user_id, department, phone, email, weight, has_won, win_count, high_award_level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [
        participant.name,
        participant.user_id || null,
        participant.department || null,
        null, // phone
        null, // email
        1.0,  // weight
        0,    // has_won
        0,    // win_count
        100,  // high_award_level
        currentTime,
        currentTime
      ]
    }));

    try {
      await dbTransaction(insertOperations);
      
      res.json({
        message: '导入完成',
        total: participants.length,
        success: newParticipants.length,
        duplicates: duplicateCount,
        errors: 0,
        errorDetails: duplicateCount > 0 ? [`跳过 ${duplicateCount} 个重复参与者`] : []
      });
    } catch (error) {
      console.error('批量导入事务失败:', error);
      res.status(500).json({ 
        error: '批量导入失败: ' + error.message,
        total: participants.length,
        success: 0,
        duplicates: duplicateCount,
        errors: newParticipants.length
      });
    }
  } catch (error) {
    console.error('批量导入参与者失败:', error);
    res.status(500).json({ error: '批量导入失败: ' + error.message });
  }
});

export default router;
import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init.js';

const router = express.Router();

// 获取所有参与者
router.get('/', async (req, res) => {
  try {
    const participants = await dbAll('SELECT * FROM Participant ORDER BY name');
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
      ORDER BY name
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
    const result = await dbRun(
      'INSERT INTO Participant (name, user_id, department, phone, email, weight, has_won, win_count, high_award_level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, null, department || null, phone || null, email || null, 1.0, 0, 0, 100, currentTime, currentTime]
    );

    const newParticipant = await dbGet('SELECT * FROM Participant WHERE id = ?', [result.lastID]);
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
    await dbRun(
      'UPDATE Participant SET name = ?, department = ?, phone = ?, email = ?, updatedAt = ? WHERE id = ?',
      [name, department, phone, email, currentTime, id]
    );

    const updatedParticipant = await dbGet('SELECT * FROM Participant WHERE id = ?', [id]);
    res.json(updatedParticipant);
  } catch (error) {
    console.error('更新参与者失败:', error);
    res.status(500).json({ error: '更新参与者失败' });
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

export default router;
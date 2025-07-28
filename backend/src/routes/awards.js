import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init.js';

const router = express.Router();

// 获取所有奖项
router.get('/', async (req, res) => {
  try {
    const awards = await dbAll('SELECT * FROM Award ORDER BY id');
    res.json(awards);
  } catch (error) {
    console.error('获取奖项列表失败:', error);
    res.status(500).json({ error: '获取奖项列表失败' });
  }
});

// 获取奖项配置（为前端提供奖项选择数据）
router.get('/config', async (req, res) => {
  try {
    const awards = await dbAll(`
      SELECT id, level, name, description, count as total_count, remaining_count 
      FROM Award 
      ORDER BY level
    `);
    res.json(awards);
  } catch (error) {
    console.error('获取奖项配置失败:', error);
    res.status(500).json({ error: '获取奖项配置失败' });
  }
});

// 获取单个奖项
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const award = await dbGet('SELECT * FROM Award WHERE id = ?', [id]);
    
    if (!award) {
      return res.status(404).json({ error: '奖项不存在' });
    }
    
    res.json(award);
  } catch (error) {
    console.error('获取奖项失败:', error);
    res.status(500).json({ error: '获取奖项失败' });
  }
});

// 添加奖项
router.post('/', async (req, res) => {
  try {
    const { level, name, description, count, draw_count } = req.body;
    
    if (!level || !name || !count) {
      return res.status(400).json({ error: '奖项等级、名称和数量不能为空' });
    }

    if (count <= 0) {
      return res.status(400).json({ error: '奖项数量必须大于0' });
    }

    const drawCount = draw_count || 1;
    if (drawCount <= 0 || drawCount > count) {
      return res.status(400).json({ error: '单次抽取人数必须大于0且不能超过奖项总数' });
    }

    const currentTime = new Date().toISOString();
    const result = await dbRun(
      'INSERT INTO Award (name, description, count, remaining_count, level, draw_count, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, count, count, level, drawCount, currentTime, currentTime]
    );

    const newAward = await dbGet('SELECT * FROM Award WHERE id = ?', [result.lastID]);
    res.status(201).json(newAward);
  } catch (error) {
    console.error('添加奖项失败:', error);
    res.status(500).json({ error: '添加奖项失败' });
  }
});

// 更新奖项信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, name, description, count, draw_count } = req.body;

    if (!level || !name || !count) {
      return res.status(400).json({ error: '奖项等级、名称和数量不能为空' });
    }

    if (count <= 0) {
      return res.status(400).json({ error: '奖项数量必须大于0' });
    }

    const drawCount = draw_count || 1;
    if (drawCount <= 0 || drawCount > count) {
      return res.status(400).json({ error: '单次抽取人数必须大于0且不能超过奖项总数' });
    }

    // 检查奖项是否存在
    const existing = await dbGet('SELECT * FROM Award WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '奖项不存在' });
    }

    // 计算已抽取的数量
    const drawnCount = existing.count - existing.remaining_count;
    
    if (count < drawnCount) {
      return res.status(400).json({ 
        error: `总数量不能小于已抽取数量(${drawnCount})` 
      });
    }

    const remaining_count = count - drawnCount;
    const currentTime = new Date().toISOString();

    await dbRun(
      'UPDATE Award SET level = ?, name = ?, description = ?, count = ?, remaining_count = ?, draw_count = ?, updatedAt = ? WHERE id = ?',
      [level, name, description, count, remaining_count, drawCount, currentTime, id]
    );

    const updatedAward = await dbGet('SELECT * FROM Award WHERE id = ?', [id]);
    res.json(updatedAward);
  } catch (error) {
    console.error('更新奖项失败:', error);
    res.status(500).json({ error: '更新奖项失败' });
  }
});

// 删除奖项
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查奖项是否存在
    const existing = await dbGet('SELECT * FROM Award WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '奖项不存在' });
    }

    // 检查是否有中奖记录
    const hasWinners = await dbGet('SELECT id FROM Winner WHERE award_id = ?', [id]);
    if (hasWinners) {
      return res.status(400).json({ error: '该奖项已有中奖记录，无法删除' });
    }

    await dbRun('DELETE FROM Award WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除奖项失败:', error);
    res.status(500).json({ error: '删除奖项失败' });
  }
});

export default router;
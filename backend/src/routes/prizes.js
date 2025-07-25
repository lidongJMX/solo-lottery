import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init.js';

const router = express.Router();

// 获取所有奖品
router.get('/', async (req, res) => {
  try {
    const prizes = await dbAll('SELECT * FROM prizes ORDER BY id');
    res.json(prizes);
  } catch (error) {
    console.error('获取奖品列表失败:', error);
    res.status(500).json({ error: '获取奖品列表失败' });
  }
});

// 获取单个奖品
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prize = await dbGet('SELECT * FROM prizes WHERE id = ?', [id]);
    
    if (!prize) {
      return res.status(404).json({ error: '奖品不存在' });
    }
    
    res.json(prize);
  } catch (error) {
    console.error('获取奖品失败:', error);
    res.status(500).json({ error: '获取奖品失败' });
  }
});

// 添加奖品
router.post('/', async (req, res) => {
  try {
    const { level, name, image, total_count } = req.body;
    
    if (!level || !name || !total_count) {
      return res.status(400).json({ error: '奖品等级、名称和数量不能为空' });
    }

    if (total_count <= 0) {
      return res.status(400).json({ error: '奖品数量必须大于0' });
    }

    const result = await dbRun(
      'INSERT INTO prizes (level, name, image, total_count, remaining_count) VALUES (?, ?, ?, ?, ?)',
      [level, name, image, total_count, total_count]
    );

    const newPrize = await dbGet('SELECT * FROM prizes WHERE id = ?', [result.lastID]);
    res.status(201).json(newPrize);
  } catch (error) {
    console.error('添加奖品失败:', error);
    res.status(500).json({ error: '添加奖品失败' });
  }
});

// 更新奖品信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, name, image, total_count } = req.body;

    if (!level || !name || !total_count) {
      return res.status(400).json({ error: '奖品等级、名称和数量不能为空' });
    }

    if (total_count <= 0) {
      return res.status(400).json({ error: '奖品数量必须大于0' });
    }

    // 检查奖品是否存在
    const existing = await dbGet('SELECT * FROM prizes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    // 计算已抽取的数量
    const drawnCount = existing.total_count - existing.remaining_count;
    
    if (total_count < drawnCount) {
      return res.status(400).json({ 
        error: `总数量不能小于已抽取数量(${drawnCount})` 
      });
    }

    const remaining_count = total_count - drawnCount;

    await dbRun(
      'UPDATE prizes SET level = ?, name = ?, image = ?, total_count = ?, remaining_count = ? WHERE id = ?',
      [level, name, image, total_count, remaining_count, id]
    );

    const updatedPrize = await dbGet('SELECT * FROM prizes WHERE id = ?', [id]);
    res.json(updatedPrize);
  } catch (error) {
    console.error('更新奖品失败:', error);
    res.status(500).json({ error: '更新奖品失败' });
  }
});

// 删除奖品
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查奖品是否存在
    const existing = await dbGet('SELECT * FROM prizes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    // 检查是否有中奖记录
    const hasWinners = await dbGet('SELECT id FROM winners WHERE prize_id = ?', [id]);
    if (hasWinners) {
      return res.status(400).json({ error: '该奖品已有中奖记录，无法删除' });
    }

    await dbRun('DELETE FROM prizes WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除奖品失败:', error);
    res.status(500).json({ error: '删除奖品失败' });
  }
});

export default router;
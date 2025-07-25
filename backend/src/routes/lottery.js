import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init.js';

const router = express.Router();

// 执行抽奖
router.post('/draw', async (req, res) => {
  try {
    const { prizeId, count = 1 } = req.body;
    
    if (!prizeId) {
      return res.status(400).json({ error: '请选择奖品' });
    }

    if (count <= 0 || count > 10) {
      return res.status(400).json({ error: '抽取数量必须在1-10之间' });
    }

    // 检查奖品是否存在且有剩余
    const prize = await dbGet('SELECT * FROM prizes WHERE id = ?', [prizeId]);
    if (!prize) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    if (prize.remaining_count <= 0) {
      return res.status(400).json({ error: '该奖品已抽完' });
    }

    // 获取可参与抽奖的人员
    const availableParticipants = await dbAll(`
      SELECT p.* FROM participants p
      WHERE p.id NOT IN (
        SELECT DISTINCT participant_id FROM winners
      )
    `);

    if (availableParticipants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' });
    }

    // 计算实际抽取数量
    const actualCount = Math.min(count, prize.remaining_count, availableParticipants.length);
    
    // 随机抽取中奖者
    const winners = [];
    const participantsCopy = [...availableParticipants];
    
    for (let i = 0; i < actualCount; i++) {
      const randomIndex = Math.floor(Math.random() * participantsCopy.length);
      const winner = participantsCopy.splice(randomIndex, 1)[0];
      
      // 记录中奖信息
      const result = await dbRun(
        'INSERT INTO winners (participant_id, prize_id) VALUES (?, ?)',
        [winner.id, prizeId]
      );
      
      winners.push({
        id: result.lastID,
        participant: winner,
        prize: prize,
        draw_time: new Date().toISOString()
      });
    }

    // 更新奖品剩余数量
    await dbRun(
      'UPDATE prizes SET remaining_count = remaining_count - ? WHERE id = ?',
      [actualCount, prizeId]
    );

    res.json({
      success: true,
      winners: winners,
      message: `成功抽取${actualCount}名中奖者`
    });
  } catch (error) {
    console.error('抽奖失败:', error);
    res.status(500).json({ error: '抽奖失败' });
  }
});

// 获取所有中奖记录
router.get('/winners', async (req, res) => {
  try {
    const winners = await dbAll(`
      SELECT 
        w.id,
        w.draw_time,
        p.name as participant_name,
        p.department,
        pr.level as prize_level,
        pr.name as prize_name
      FROM winners w
      JOIN participants p ON w.participant_id = p.id
      JOIN prizes pr ON w.prize_id = pr.id
      ORDER BY w.draw_time DESC
    `);
    
    res.json(winners);
  } catch (error) {
    console.error('获取中奖记录失败:', error);
    res.status(500).json({ error: '获取中奖记录失败' });
  }
});

// 获取特定奖品的中奖记录
router.get('/winners/:prizeId', async (req, res) => {
  try {
    const { prizeId } = req.params;
    
    const winners = await dbAll(`
      SELECT 
        w.id,
        w.draw_time,
        p.name as participant_name,
        p.department,
        pr.level as prize_level,
        pr.name as prize_name
      FROM winners w
      JOIN participants p ON w.participant_id = p.id
      JOIN prizes pr ON w.prize_id = pr.id
      WHERE w.prize_id = ?
      ORDER BY w.draw_time DESC
    `, [prizeId]);
    
    res.json(winners);
  } catch (error) {
    console.error('获取奖品中奖记录失败:', error);
    res.status(500).json({ error: '获取奖品中奖记录失败' });
  }
});

// 重置抽奖（清空所有中奖记录）
router.post('/reset', async (req, res) => {
  try {
    // 清空中奖记录
    await dbRun('DELETE FROM winners');
    
    // 重置所有奖品的剩余数量
    await dbRun('UPDATE prizes SET remaining_count = total_count');
    
    res.json({ message: '抽奖重置成功' });
  } catch (error) {
    console.error('重置抽奖失败:', error);
    res.status(500).json({ error: '重置抽奖失败' });
  }
});

// 撤销中奖记录
router.delete('/winners/:winnerId', async (req, res) => {
  try {
    const { winnerId } = req.params;
    
    // 获取中奖记录
    const winner = await dbGet('SELECT * FROM winners WHERE id = ?', [winnerId]);
    if (!winner) {
      return res.status(404).json({ error: '中奖记录不存在' });
    }
    
    // 删除中奖记录
    await dbRun('DELETE FROM winners WHERE id = ?', [winnerId]);
    
    // 恢复奖品数量
    await dbRun(
      'UPDATE prizes SET remaining_count = remaining_count + 1 WHERE id = ?',
      [winner.prize_id]
    );
    
    res.json({ message: '中奖记录撤销成功' });
  } catch (error) {
    console.error('撤销中奖记录失败:', error);
    res.status(500).json({ error: '撤销中奖记录失败' });
  }
});

export default router;
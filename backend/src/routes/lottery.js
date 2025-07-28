import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/init.js';

const router = express.Router();

// 执行抽奖
router.post('/draw', async (req, res) => {
  try {
    const { awardId, count = 1 } = req.body;
    
    if (!awardId) {
      return res.status(400).json({ error: '请选择奖项' });
    }

    if (count <= 0 || count > 10) {
      return res.status(400).json({ error: '抽取数量必须在1-10之间' });
    }

    // 检查奖项是否存在且有剩余
    const award = await dbGet('SELECT * FROM Award WHERE id = ?', [awardId]);
    if (!award) {
      return res.status(404).json({ error: '奖项不存在' });
    }

    if (award.remaining_count <= 0) {
      return res.status(400).json({ error: '该奖项已抽完' });
    }

    // 获取可参与抽奖的人员
    const availableParticipants = await dbAll(`
      SELECT p.* FROM Participant p
      WHERE p.id NOT IN (
        SELECT DISTINCT participant_id FROM Winner
      )
    `);

    if (availableParticipants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' });
    }

    // 计算实际抽取数量
    const actualCount = Math.min(count, award.remaining_count, availableParticipants.length);
    
    // 随机抽取中奖者
    const winners = [];
    const participantsCopy = [...availableParticipants];
    
    for (let i = 0; i < actualCount; i++) {
      const randomIndex = Math.floor(Math.random() * participantsCopy.length);
      const winner = participantsCopy.splice(randomIndex, 1)[0];
      
      // 记录中奖信息
      const currentTime = new Date().toISOString();
      const result = await dbRun(
        'INSERT INTO Winner (participant_id, award_id, epoch, draw_time, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [winner.id, awardId, 0, currentTime, currentTime, currentTime]
      );
      
      winners.push({
        id: result.lastID,
        name: winner.name,
        award: `${award.level} - ${award.name}`,
        participant: winner,
        awardInfo: award,
        draw_time: new Date().toISOString()
      });
    }

    // 更新奖项剩余数量
    await dbRun(
      'UPDATE Award SET remaining_count = remaining_count - ? WHERE id = ?',
      [actualCount, awardId]
    );

    res.json({
      success: true,
      winners: winners,
      actualCount: actualCount,
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
        p.name,
        p.department,
        pr.level as award_level,
        pr.name as award_name,
        (pr.level || ' - ' || pr.name) as award
      FROM Winner w
      JOIN Participant p ON w.participant_id = p.id
      JOIN Award pr ON w.award_id = pr.id
      ORDER BY w.draw_time DESC
    `);
    
    res.json(winners);
  } catch (error) {
    console.error('获取中奖记录失败:', error);
    res.status(500).json({ error: '获取中奖记录失败' });
  }
});

// 获取特定奖项的中奖记录
router.get('/winners/:awardId', async (req, res) => {
  try {
    const { awardId } = req.params;
    
    const winners = await dbAll(`
      SELECT 
        w.id,
        w.draw_time,
        p.name,
        p.department,
        pr.level as award_level,
        pr.name as award_name,
        (pr.level || ' - ' || pr.name) as award
      FROM Winner w
      JOIN Participant p ON w.participant_id = p.id
      JOIN Award pr ON w.award_id = pr.id
      WHERE w.award_id = ?
      ORDER BY w.draw_time DESC
    `, [awardId]);
    
    res.json(winners);
  } catch (error) {
    console.error('获取奖项中奖记录失败:', error);
    res.status(500).json({ error: '获取奖项中奖记录失败' });
  }
});

// 重置抽奖（清空所有中奖记录）
router.post('/reset', async (req, res) => {
  try {
    // 清空中奖记录
    await dbRun('DELETE FROM Winner');
    
    // 重置所有奖项的剩余数量
    await dbRun('UPDATE Award SET remaining_count = count');
    
    res.json({ message: '抽奖重置成功' });
  } catch (error) {
    console.error('重置抽奖失败:', error);
    res.status(500).json({ error: '重置抽奖失败' });
  }
});

// 获取抽奖状态信息
router.get('/status', async (req, res) => {
  try {
    // 获取奖项信息
    const awards = await dbAll(`
      SELECT id, level, name, description, count as total_count, remaining_count 
      FROM Award 
      ORDER BY level
    `);

    // 获取可参与人数
    const availableCount = await dbGet(`
      SELECT COUNT(*) as count FROM Participant p
      WHERE p.id NOT IN (
        SELECT DISTINCT participant_id FROM Winner
      )
    `);

    // 获取总中奖人数
    const totalWinners = await dbGet('SELECT COUNT(*) as count FROM Winner');

    res.json({
      awards: awards,
      availableParticipants: availableCount.count,
      totalWinners: totalWinners.count
    });
  } catch (error) {
    console.error('获取抽奖状态失败:', error);
    res.status(500).json({ error: '获取抽奖状态失败' });
  }
});

// 开始新一轮抽奖
router.post('/next-round', async (req, res) => {
  try {
    // 这里可以添加轮次管理逻辑
    // 目前只是返回成功状态
    res.json({ 
      success: true, 
      message: '新一轮抽奖已开始' 
    });
  } catch (error) {
    console.error('开始新轮次失败:', error);
    res.status(500).json({ error: '开始新轮次失败' });
  }
});

// 撤销中奖记录
router.delete('/winners/:winnerId', async (req, res) => {
  try {
    const { winnerId } = req.params;
    
    // 获取中奖记录
    const winner = await dbGet('SELECT * FROM Winner WHERE id = ?', [winnerId]);
    if (!winner) {
      return res.status(404).json({ error: '中奖记录不存在' });
    }
    
    // 删除中奖记录
    await dbRun('DELETE FROM Winner WHERE id = ?', [winnerId]);
    
    // 恢复奖项数量
    await dbRun(
      'UPDATE Award SET remaining_count = remaining_count + 1 WHERE id = ?',
      [winner.award_id]
    );
    
    res.json({ message: '中奖记录撤销成功' });
  } catch (error) {
    console.error('撤销中奖记录失败:', error);
    res.status(500).json({ error: '撤销中奖记录失败' });
  }
});

export default router;
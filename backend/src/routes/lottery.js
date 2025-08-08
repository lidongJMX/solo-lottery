import express from 'express';
import crypto from 'crypto';
import { dbAll, dbGet, dbRun, dbTransaction } from '../database/init.js';

const router = express.Router();

// 执行抽奖 - 完全符合抽奖规则-v2.md
router.post('/draw', async (req, res) => {
  try {
    const { awardId, count = 1 } = req.body;
    
    if (!awardId) {
      return res.status(400).json({ error: '请选择奖项' });
    }

    // 检查奖项是否存在且有剩余
    const award = await dbGet('SELECT * FROM Award WHERE id = ?', [awardId]);
    if (!award) {
      return res.status(404).json({ error: '奖项不存在' });
    }

    if (award.remaining_count <= 0) {
      return res.status(400).json({ error: '该奖项已抽完' });
    }

    // 验证抽取数量
    if (count <= 0 || count > award.count) {
      return res.status(400).json({ error: `抽取数量必须在1到${award.count}之间` });
    }

    if (count > award.remaining_count) {
      return res.status(400).json({ error: `抽取数量不能超过剩余数量${award.remaining_count}` });
    }

    // 获取当前轮次
    const currentEpochInfo = await dbGet('SELECT * FROM Epoch ORDER BY epoch_id DESC LIMIT 1');
    const epoch = currentEpochInfo ? currentEpochInfo.epoch : 1;
    console.log('当前轮次:', epoch);
    // 1. 构建抽奖池：基础参与者 + 返场参与者
    const lotteryPool = await buildLotteryPool(epoch);
    
    // 2. 筛选参与者：移除不符合当前抽奖条件的员工
    // 获取配置中的最小轮次间隔
    const config = await dbGet('SELECT * FROM MultiWinConfig LIMIT 1');
    const minEpochInterval = config ? config.minEpochInterval : 3;
    const eligibleParticipants = await filterEligibleParticipants(lotteryPool, award, epoch, minEpochInterval);
    
    if (eligibleParticipants.length === 0) {
      return res.status(400).json({ error: '没有符合条件的参与者' });
    }

    // 3. 检查全员中奖机制
    const totalRemainingAwards = await dbGet(`
      SELECT SUM(remaining_count) as total FROM Award WHERE remaining_count > 0
    `);
    const neverWonParticipants = await dbAll(`
      SELECT p.* FROM Participant p
      WHERE p.id NOT IN (SELECT DISTINCT participant_id FROM Winner)
    `);
    
    const isAllWinMode = totalRemainingAwards.total >= neverWonParticipants.length;
    
    // 4. 计算实际抽取数量
    const actualCount = Math.min(count, award.remaining_count, eligibleParticipants.length);
    
    // 5. 执行抽奖：根据概率权重随机抽取
    const winners = [];
    const participantsCopy = [...eligibleParticipants];
    
    for (let i = 0; i < actualCount; i++) {
      let selectedParticipant;
      
      if (isAllWinMode && neverWonParticipants.some(p => participantsCopy.some(pc => pc.id === p.id))) {
        // 全员中奖模式：优先选择未中奖员工
        const neverWonInPool = participantsCopy.filter(p => 
          neverWonParticipants.some(nw => nw.id === p.id)
        );
        if (neverWonInPool.length > 0) {
          const randomBytes = crypto.randomBytes(4);
          const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
          const randomIndex = Math.floor(randomValue * neverWonInPool.length);
          selectedParticipant = neverWonInPool[randomIndex];
          const poolIndex = participantsCopy.findIndex(p => p.id === selectedParticipant.id);
          participantsCopy.splice(poolIndex, 1);
        } else {
          selectedParticipant = selectByProbability(participantsCopy);
        }
      } else {
        // 正常模式：按概率权重选择
        selectedParticipant = selectByProbability(participantsCopy);
      }
      
      // 获取参与者当前的中奖统计
      const participantStats = await dbGet(
        'SELECT win_count, high_award_level FROM Participant WHERE id = ?',
        [selectedParticipant.id]
      );
      
      const newWinCount = (participantStats.win_count || 0) + 1;
      const currentHighLevel = participantStats.high_award_level || 999;
      const newHighLevel = Math.min(currentHighLevel, award.level);
      
      // 使用事务记录中奖信息和更新参与者状态
      const currentTime = new Date().toISOString();
      const transactionOperations = [
        {
          sql: 'INSERT INTO Winner (participant_id, award_id, epoch, draw_time, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
          params: [selectedParticipant.id, awardId, epoch, currentTime, currentTime, currentTime]
        },
        {
          sql: 'UPDATE Participant SET has_won = 1, win_count = ?, high_award_level = ?, updatedAt = ? WHERE id = ?',
          params: [newWinCount, newHighLevel, currentTime, selectedParticipant.id]
        }
      ];
      
      const results = await dbTransaction(transactionOperations);
      const result = results[0]; // 获取插入Winner记录的结果
      
      winners.push({
        id: result.lastID,
        name: selectedParticipant.name,
        award: `${award.level} - ${award.name}`,
        participant: selectedParticipant,
        awardInfo: award,
        draw_time: currentTime
      });
    }

    // 使用事务更新奖项剩余数量
    await dbTransaction([
      {
        sql: 'UPDATE Award SET remaining_count = remaining_count - ? WHERE id = ?',
        params: [actualCount, awardId]
      }
    ]);

    res.json({
      success: true,
      winners: winners,
      actualCount: actualCount,
      message: `成功抽取${actualCount}名中奖者`,
      isAllWinMode: isAllWinMode
    });
  } catch (error) {
    console.error('抽奖失败:', error);
    res.status(500).json({ error: '抽奖失败' });
  }
});

// 构建抽奖池：基础参与者 + 返场参与者
async function buildLotteryPool(currentEpoch) {
  // 获取所有参与者的完整中奖信息
  const allParticipants = await dbAll(`
    SELECT p.*, 
           COALESCE(COUNT(w.id), 0) as win_count,
           COALESCE(MIN(a.level), 999) as highest_award_level,
           COALESCE(MAX(w.epoch), 0) as last_win_epoch
    FROM Participant p
    LEFT JOIN Winner w ON p.id = w.participant_id
    LEFT JOIN Award a ON w.award_id = a.id
    GROUP BY p.id, p.name, p.department, p.weight
  `);
  
  // 应用多次中奖控制策略
  const controlledParticipants = await applyMultiWinControl(allParticipants, currentEpoch);
  
  console.log('抽奖池构建完成:', {
    总参与者: allParticipants.length,
    控制后参与者: controlledParticipants.length,
    未中奖者: controlledParticipants.filter(p => (p.win_count || 0) === 0).length,
    一次中奖者: controlledParticipants.filter(p => (p.win_count || 0) === 1).length,
    二次中奖者: controlledParticipants.filter(p => (p.win_count || 0) === 2).length,
    三次中奖者: controlledParticipants.filter(p => (p.win_count || 0) === 3).length
  });
  
  return controlledParticipants;
}

// 筛选符合条件的参与者（优化版：合并数据库查询 + 多次中奖控制）
async function filterEligibleParticipants(lotteryPool, award, currentEpoch, minEpochInterval = 3) {
  if (lotteryPool.length === 0) return [];
  
  // 提取抽奖池中所有参与者的ID
  const participantIds = lotteryPool.map(p => p.id);
  // 为SQL查询生成对应数量的占位符（?），用于IN子句
  const placeholders = participantIds.map(() => '?').join(',');
  
  // 优化：一次查询获取所有参与者的完整中奖信息，包括最近中奖轮次
  const participantWinInfo = await dbAll(`
    SELECT 
      p.id,
      p.name,
      p.department,
      p.weight,
      COALESCE(COUNT(w.id), 0) as win_count,
      COALESCE(MIN(a.level), 999) as highest_award_level,
      COALESCE(SUM(CASE WHEN w.epoch = ? THEN 1 ELSE 0 END), 0) as current_round_wins,
      COALESCE(SUM(CASE WHEN w.award_id = ? THEN 1 ELSE 0 END), 0) as same_award_wins,
      COALESCE(MAX(w.epoch), 0) as last_win_epoch
    FROM Participant p
    LEFT JOIN Winner w ON p.id = w.participant_id
    LEFT JOIN Award a ON w.award_id = a.id
    WHERE p.id IN (${placeholders})
    GROUP BY p.id, p.name, p.department, p.weight
  `, [currentEpoch, award.id, ...participantIds]);
  
  // 应用多次中奖控制策略
  const controlledParticipants = await applyMultiWinControl(participantWinInfo, currentEpoch);
  
  // 在内存中筛选符合条件的参与者
  const eligible = controlledParticipants.filter(participant => {
    const winCount = participant.win_count || 0;
    const highestAwardLevel = participant.highest_award_level || 999;
    const currentRoundWins = participant.current_round_wins || 0;
    const sameAwardWins = participant.same_award_wins || 0;
    const lastWinEpoch = participant.last_win_epoch || 0;
    
    // 检查总次数限制：最多中奖3次
    if (winCount >= 3) {
      return false;
    }
    
    // 检查奖项限制：已获得一等奖、二等奖的员工，不能再次参与一等奖、二等奖的抽奖
    if (highestAwardLevel <= 2 && award.level <= 2) {
      return false;
    }
    
    // 检查轮次限制：当轮已中奖的员工，不能在该轮次中再次中奖
    if (currentRoundWins > 0) {
      return false;
    }
    
    // 检查同一奖项不能重复抽取
    if (sameAwardWins > 0) {
      return false;
    }
    
    // 检查多次中奖者的轮次间隔限制：间隔必须大于等于配置的最小间隔
    if (winCount > 0 && (currentEpoch - lastWinEpoch) < minEpochInterval) {
      return false;
    }
    
    // 添加概率权重信息
    participant.win_count = winCount;
    participant.highest_award_level = highestAwardLevel;
    
    return true;
  });
  
  return eligible;
}

// 多次中奖控制策略：根据配置保持指定比例的多次中奖者
async function applyMultiWinControl(participants, currentEpoch) {
  // 获取多次中奖控制配置
  const config = await dbGet('SELECT * FROM MultiWinConfig LIMIT 1');
  const defaultConfig = {
    threeWinPercentage: 8,    // 8%的三次中奖者（提高目标）
    twoWinPercentage: 15,     // 15%的二次中奖者（提高目标）
    minEpochInterval: 2,      // 最小轮次间隔（减少限制）
    enabled: true             // 是否启用多次中奖控制
  };
  
  const activeConfig = config || defaultConfig;
  
  // 如果未启用多次中奖控制，直接返回原参与者列表
  if (!activeConfig.enabled) {
    console.log('多次中奖控制已禁用，使用原始参与者列表');
    return participants;
  }
  
  // 统计当前各中奖次数的人数
  const winCountStats = {
    0: participants.filter(p => (p.win_count || 0) === 0).length,
    1: participants.filter(p => (p.win_count || 0) === 1).length,
    2: participants.filter(p => (p.win_count || 0) === 2).length,
    3: participants.filter(p => (p.win_count || 0) === 3).length
  };
  
  const totalParticipants = participants.length;
  
  // 计算目标比例（使用配置中的值）
  const targetThreeWins = Math.floor(totalParticipants * (activeConfig.threeWinPercentage / 100));
  const targetTwoWins = Math.floor(totalParticipants * (activeConfig.twoWinPercentage / 100));
  
  console.log('多次中奖控制统计:', {
    总参与者: totalParticipants,
    当前统计: winCountStats,
    目标三次中奖者: targetThreeWins,
    目标二次中奖者: targetTwoWins
  });
  
  // 分类参与者
  const neverWon = participants.filter(p => (p.win_count || 0) === 0);
  const wonOnce = participants.filter(p => (p.win_count || 0) === 1);
  const wonTwice = participants.filter(p => (p.win_count || 0) === 2);
  const wonThrice = participants.filter(p => (p.win_count || 0) === 3);
  
  let controlledPool = [];
  
  // 1. 优先保证未中奖者的参与机会
  controlledPool.push(...neverWon);
  
  // 2. 积极促进二次中奖：允许更多一次中奖者参与
  // 计算需要的一次中奖者数量来达到目标二次中奖比例
  const neededOneWinners = Math.max(
    targetTwoWins - winCountStats[2], // 基础需求
    Math.floor(totalParticipants * 0.5) // 至少50%的一次中奖者参与
  );
  
  // 随机选择一次中奖者参与（进一步放宽轮次间隔要求）
  const eligibleOnceWinners = wonOnce.filter(p => 
    (currentEpoch - (p.last_win_epoch || 0)) >= 1 // 只要不是当前轮次即可
  );
  
  const selectedOnceWinners = shuffleArray(eligibleOnceWinners)
    .slice(0, Math.min(neededOneWinners, eligibleOnceWinners.length));
  
  controlledPool.push(...selectedOnceWinners);
  
  // 3. 积极促进三次中奖：计算所需的二次中奖者数量
  const neededThreeWinners = Math.max(0, targetThreeWins - winCountStats[3]);
  if (wonTwice.length > 0) {
    // 更激进策略：至少保证80%的二次中奖者参与
    const minTwiceWinners = Math.ceil(wonTwice.length * 0.8);
    const targetTwiceWinners = Math.max(neededThreeWinners, minTwiceWinners);
    
    // 进一步放宽轮次间隔要求（只要不是当前轮次即可）
    const relaxedInterval = 1;
    const eligibleTwiceWinners = wonTwice.filter(p => {
      const lastWinEpoch = p.last_win_epoch || 0;
      return (currentEpoch - lastWinEpoch) >= relaxedInterval;
    });
    
    const selectedTwiceWinners = shuffleArray(eligibleTwiceWinners)
      .slice(0, Math.min(targetTwiceWinners, eligibleTwiceWinners.length));
    
    // 为二次中奖者增加更高权重（200%提升）
    selectedTwiceWinners.forEach(p => {
      p.multiWinBonus = 3.0;
    });
    
    controlledPool.push(...selectedTwiceWinners);
  }
  
  // 4. 统计控制后的参与者信息
   const controlStats = {
     total: controlledPool.length,
     neverWon: controlledPool.filter(p => (p.win_count || 0) === 0).length,
     wonOnce: controlledPool.filter(p => (p.win_count || 0) === 1).length,
     wonTwice: controlledPool.filter(p => (p.win_count || 0) === 2).length,
     wonThrice: controlledPool.filter(p => (p.win_count || 0) >= 3).length
   };
   
   console.log(`多次中奖控制后参与者分布: 总计${controlStats.total}人 (0次:${controlStats.neverWon}, 1次:${controlStats.wonOnce}, 2次:${controlStats.wonTwice}, 3次:${controlStats.wonThrice})`);
  
  // 4. 如果已达到目标比例，则限制多次中奖者参与
  // 三次中奖者已达到目标，不再参与
  // 二次中奖者如果已达到目标，也限制参与
  
  console.log('多次中奖控制结果:', {
    原始参与者: participants.length,
    控制后参与者: controlledPool.length,
    未中奖者: controlledPool.filter(p => (p.win_count || 0) === 0).length,
    一次中奖者: controlledPool.filter(p => (p.win_count || 0) === 1).length,
    二次中奖者: controlledPool.filter(p => (p.win_count || 0) === 2).length,
    三次中奖者: controlledPool.filter(p => (p.win_count || 0) === 3).length
  });
  
  return controlledPool;
}

// 高质量随机洗牌函数
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
    const j = Math.floor(randomValue * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 根据概率权重选择参与者
function selectByProbability(participants) {
  if (participants.length === 0) return null;
  if (participants.length === 1) {
    const selected = participants[0];
    participants.splice(0, 1);
    return selected;
  }
  
  // 统计各部门人数
  const departmentCounts = {};
  participants.forEach(p => {
    const dept = p.department || '未分配部门';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  
  // 计算权重：中奖次数越多，中奖等级越高，权重越低；部门人数越多，权重越高
  const weights = participants.map(p => {
    const winCount = p.win_count || 0;
    const highestLevel = p.highest_award_level || 999;
    const department = p.department || '未分配部门';
    const departmentSize = departmentCounts[department];
    
    // 基础权重
    let weight = 100;
    
    // 改进：调整权重影响系数到0.95（减少对中奖历史的惩罚，增加重复中奖概率）
    weight *= Math.pow(0.95, winCount);
    
    // 中奖等级影响：等级越高（数值越小）权重越低
    if (highestLevel <= 2) {
      weight *= Math.pow(0.5, 4 - highestLevel); // 一等奖权重最低
    }
    
    // 部门人数影响：部门人数越多，权重越高（使用对数函数避免权重差异过大）
    const departmentBonus = 1 + Math.log10(departmentSize) * 0.3; // 对数增长，系数0.1控制影响程度，保持适度差异
    weight *= departmentBonus;
    
    // 应用多次中奖促进权重
    if (p.multiWinBonus) {
      weight *= p.multiWinBonus;
    }
    
    return Math.max(weight, 1); // 确保最小权重为1
  });
  
  // 改进：使用crypto.randomBytes()进行高质量随机选择
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
  let random = randomValue * totalWeight;
  
  for (let i = 0; i < participants.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      const selected = participants[i];
      participants.splice(i, 1);
      return selected;
    }
  }
  
  // 兜底：返回最后一个
  return participants.pop();
}

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
        (pr.level || ' - ' || pr.name) as award,
        w.epoch
      FROM Winner w
      JOIN Participant p ON w.participant_id = p.id
      JOIN Award pr ON w.award_id = pr.id
      ORDER BY w.draw_time DESC
    `);
    console.log('winners',winners)
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
        (pr.level || ' - ' || pr.name) as award,
        w.epoch
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
    const currentTime = new Date().toISOString();
    
    // 使用事务确保数据一致性，按正确顺序删除数据以避免外键约束问题
    const resetOperations = [
      // 1. 清空中奖记录（必须先删除，因为有外键约束）
      {
        sql: 'DELETE FROM Winner',
        params: []
      },
      // 2. 重置所有奖项的剩余数量
      {
        sql: 'UPDATE Award SET remaining_count = count',
        params: []
      },
      // 3. 重置所有参与者的中奖状态
      {
        sql: 'UPDATE Participant SET weight = 100, has_won = 0, win_count = 0, high_award_level = 100, updatedAt = ?',
        params: [currentTime]
      },
      // 4. 重置当前轮次状态
      {
        sql: 'UPDATE Epoch SET epoch = 1, status = 1, updatedAt = ?',
        params: [currentTime]
      }
    ];
    
    await dbTransaction(resetOperations);
    
    console.log('抽奖数据重置成功');
    res.json({ message: '抽奖重置成功' });
  } catch (error) {
    console.error('重置抽奖失败:', error);
    res.status(500).json({ error: '重置抽奖失败: ' + error.message });
  }
});

// 获取抽奖状态信息
router.get('/status', async (req, res) => {
  try {
    // 获取当前轮次信息
    const currentEpoch = await dbGet('SELECT * FROM Epoch ORDER BY epoch_id DESC LIMIT 1');
    
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
      currentEpoch: currentEpoch ? currentEpoch.epoch : 0,
      epochStatus: currentEpoch ? currentEpoch.status : 1,
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
    // 获取当前轮次信息
    const currentEpoch = await dbGet('SELECT * FROM Epoch ORDER BY epoch_id DESC LIMIT 1');
    
    if (!currentEpoch) {
      return res.status(400).json({ error: '轮次信息不存在' });
    }
    
    // 检查轮次状态，状态为1表示开启了轮次抽奖
    if (currentEpoch.status !== 1) {
      return res.status(400).json({ 
        error: '当前轮次状态不允许进入下一轮',
        currentStatus: currentEpoch.status
      });
    }
    
    // 轮次加1
    const newEpoch = currentEpoch.epoch + 1;
    const currentTime = new Date().toISOString();
    
    // 更新当前轮次状态为结束（状态设为0）
    await dbRun(
      'UPDATE Epoch SET epoch = ?, status = 1, updatedAt = ? WHERE epoch_id = ?',
      [newEpoch, currentTime, currentEpoch.epoch_id]
    );
    console.log('newEpoch', newEpoch);
    res.json({ 
      success: true, 
      message: `新一轮抽奖已开始，当前轮次：${newEpoch}`,
      previousEpoch: currentEpoch.epoch,
      currentEpoch: newEpoch,
      epochId: currentEpoch.epoch_id
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
    
    // 重新计算该参与者删除此记录后的中奖统计
    const participantWins = await dbAll(
      `SELECT w.*, a.level FROM Winner w 
       JOIN Award a ON w.award_id = a.id 
       WHERE w.participant_id = ? AND w.id != ?
       ORDER BY a.level ASC`,
      [winner.participant_id, winnerId]
    );
    
    const currentTime = new Date().toISOString();
    const transactionOperations = [
      // 1. 删除中奖记录
      {
        sql: 'DELETE FROM Winner WHERE id = ?',
        params: [winnerId]
      },
      // 2. 恢复奖项数量
      {
        sql: 'UPDATE Award SET remaining_count = remaining_count + 1 WHERE id = ?',
        params: [winner.award_id]
      }
    ];
    
    // 3. 更新参与者中奖统计
    if (participantWins.length === 0) {
      // 该参与者已无中奖记录，重置为未中奖状态
      transactionOperations.push({
        sql: 'UPDATE Participant SET has_won = 0, win_count = 0, high_award_level = 100, updatedAt = ? WHERE id = ?',
        params: [currentTime, winner.participant_id]
      });
    } else {
      // 重新计算中奖统计
      const newWinCount = participantWins.length;
      const newHighLevel = Math.min(...participantWins.map(w => w.level));
      
      transactionOperations.push({
        sql: 'UPDATE Participant SET has_won = 1, win_count = ?, high_award_level = ?, updatedAt = ? WHERE id = ?',
        params: [newWinCount, newHighLevel, currentTime, winner.participant_id]
      });
    }
    
    // 使用事务执行所有操作
    await dbTransaction(transactionOperations);
    
    res.json({ message: '中奖记录撤销成功' });
  } catch (error) {
    console.error('撤销中奖记录失败:', error);
    res.status(500).json({ error: '撤销中奖记录失败' });
  }
});

// 获取统计分析数据
router.get('/statistics', async (req, res) => {
  try {
    // 1. 基础统计数据
    const totalParticipants = await dbGet('SELECT COUNT(*) as count FROM Participant');
    const totalWinners = await dbGet('SELECT COUNT(DISTINCT participant_id) as count FROM Winner');
    const totalDraws = await dbGet('SELECT COUNT(*) as count FROM Winner');
    
    // 2. 中奖次数分布
    const winCountDistribution = await dbAll(`
      SELECT 
        COALESCE(win_count, 0) as win_count,
        COUNT(*) as participant_count
      FROM Participant 
      GROUP BY win_count 
      ORDER BY win_count
    `);
    
    // 3. 奖项等级分布
    const awardLevelDistribution = await dbAll(`
      SELECT 
        a.level,
        a.name as award_name,
        COUNT(w.id) as win_count
      FROM Award a
      LEFT JOIN Winner w ON a.id = w.award_id
      GROUP BY a.id, a.level, a.name
      ORDER BY a.level
    `);
    
    // 4. 部门中奖分布
    const departmentDistribution = await dbAll(`
      SELECT 
        COALESCE(p.department, '未知部门') as department,
        COUNT(DISTINCT p.id) as total_participants,
        COUNT(w.id) as total_wins,
        COUNT(DISTINCT w.participant_id) as unique_winners
      FROM Participant p
      LEFT JOIN Winner w ON p.id = w.participant_id
      GROUP BY p.department
      ORDER BY total_wins DESC
    `);
    
    // 5. 轮次中奖分布
    const epochDistribution = await dbAll(`
      SELECT 
        w.epoch,
        COUNT(*) as draw_count,
        COUNT(DISTINCT w.participant_id) as unique_winners
      FROM Winner w
      GROUP BY w.epoch
      ORDER BY w.epoch
    `);
    
    // 6. 计算正态分布检验数据
    const winCounts = winCountDistribution.map(item => {
      return Array(item.participant_count).fill(item.win_count);
    }).flat();
    
    // 计算基本统计量
    const mean = winCounts.reduce((sum, count) => sum + count, 0) / winCounts.length;
    const variance = winCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / winCounts.length;
    const stdDev = Math.sqrt(variance);
    
    // 计算偏度和峰度
    const skewness = winCounts.reduce((sum, count) => sum + Math.pow((count - mean) / stdDev, 3), 0) / winCounts.length;
    const kurtosis = winCounts.reduce((sum, count) => sum + Math.pow((count - mean) / stdDev, 4), 0) / winCounts.length - 3;
    
    // 简单的正态性检验（基于偏度和峰度）
    const isNormalDistribution = Math.abs(skewness) < 1 && Math.abs(kurtosis) < 1;
    
    // 7. 中奖概率分析
    const winProbability = totalWinners.count / totalParticipants.count;
    const averageWinsPerWinner = totalDraws.count / (totalWinners.count || 1);

    // 8. 为图表生成数据点
    const dataPoints = winCountDistribution.map(item => [item.win_count, item.participant_count]);
    
    res.json({
      basicStats: {
        totalParticipants: totalParticipants.count,
        totalWinners: totalWinners.count,
        totalDraws: totalDraws.count,
        winProbability: winProbability,
        averageWinsPerWinner: averageWinsPerWinner
      },
      distributions: {
        winCount: winCountDistribution,
        awardLevel: awardLevelDistribution,
        department: departmentDistribution,
        epoch: epochDistribution
      },
      normalityTest: {
        mean: mean,
        variance: variance,
        standardDeviation: stdDev,
        skewness: skewness,
        kurtosis: kurtosis,
        isNormalDistribution: isNormalDistribution,
        dataPoints: dataPoints, // 添加数据点
        interpretation: {
          skewnessLevel: Math.abs(skewness) < 0.5 ? '轻微偏斜' : Math.abs(skewness) < 1 ? '中度偏斜' : '严重偏斜',
          kurtosisLevel: Math.abs(kurtosis) < 0.5 ? '接近正态' : Math.abs(kurtosis) < 1 ? '轻微偏离' : '严重偏离',
          conclusion: isNormalDistribution ? '数据接近正态分布' : '数据偏离正态分布'
        }
      },
      fairnessAnalysis: {
        expectedWinsPerPerson: totalDraws.count / totalParticipants.count,
        actualWinnerRatio: winProbability,
        concentrationIndex: totalDraws.count / (totalWinners.count || 1), // 中奖集中度
        fairnessScore: isNormalDistribution && winProbability > 0.1 ? '良好' : '需要关注'
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取多次中奖控制配置
router.get('/multi-win-config', async (req, res) => {
  try {
    // 从数据库获取配置，如果不存在则返回默认值
    const config = await dbGet('SELECT * FROM MultiWinConfig LIMIT 1');
    
    const defaultConfig = {
      threeWinPercentage: 8,    // 8%的三次中奖者（提高目标）
      twoWinPercentage: 15,     // 15%的二次中奖者（提高目标）
      minEpochInterval: 2,      // 最小轮次间隔（减少限制）
      enabled: 1                // 是否启用多次中奖控制
    };
    
    const responseConfig = config || defaultConfig;
    // 确保enabled字段返回布尔值
    if (responseConfig.enabled !== undefined) {
      responseConfig.enabled = Boolean(responseConfig.enabled);
    }
    
    res.json({
      success: true,
      config: responseConfig
    });
  } catch (error) {
    console.error('获取多次中奖控制配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 更新多次中奖控制配置
router.post('/multi-win-config', async (req, res) => {
  try {
    const { threeWinPercentage, twoWinPercentage, minEpochInterval, enabled } = req.body;
    
    // 验证参数
    if (threeWinPercentage < 0 || threeWinPercentage > 100) {
      return res.status(400).json({ error: '三次中奖者比例必须在0-100之间' });
    }
    
    if (twoWinPercentage < 0 || twoWinPercentage > 100) {
      return res.status(400).json({ error: '二次中奖者比例必须在0-100之间' });
    }
    
    if (minEpochInterval < 1 || minEpochInterval > 10) {
      return res.status(400).json({ error: '最小轮次间隔必须在1-10之间' });
    }
    
    const currentTime = new Date().toISOString();
    
    // 检查配置是否已存在
    const existingConfig = await dbGet('SELECT * FROM MultiWinConfig LIMIT 1');
    
    if (existingConfig) {
      // 更新现有配置
      await dbRun(
        'UPDATE MultiWinConfig SET threeWinPercentage = ?, twoWinPercentage = ?, minEpochInterval = ?, enabled = ?, updatedAt = ?',
        [threeWinPercentage, twoWinPercentage, minEpochInterval, enabled ? 1 : 0, currentTime]
      );
    } else {
      // 插入新配置
      await dbRun(
        'INSERT INTO MultiWinConfig (threeWinPercentage, twoWinPercentage, minEpochInterval, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [threeWinPercentage, twoWinPercentage, minEpochInterval, enabled ? 1 : 0, currentTime, currentTime]
      );
    }
    
    res.json({
      success: true,
      message: '多次中奖控制配置更新成功',
      config: {
        threeWinPercentage,
        twoWinPercentage,
        minEpochInterval,
        enabled
      }
    });
  } catch (error) {
    console.error('更新多次中奖控制配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
});

// 获取多次中奖统计信息
router.get('/multi-win-stats', async (req, res) => {
  try {
    // 获取各中奖次数的统计
    const winCountStats = await dbAll(`
      SELECT 
        p.win_count,
        COUNT(*) as participant_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Participant), 2) as percentage
      FROM Participant p
      GROUP BY p.win_count
      ORDER BY p.win_count
    `);
    
    // 获取轮次间隔统计
    const epochIntervalStats = await dbAll(`
      SELECT 
        p.id,
        p.name,
        p.win_count,
        MAX(w.epoch) as last_win_epoch,
        (SELECT MAX(epoch) FROM Epoch) as current_epoch
      FROM Participant p
      LEFT JOIN Winner w ON p.id = w.participant_id
      WHERE p.win_count > 0
      GROUP BY p.id, p.name, p.win_count
    `);
    
    // 计算当前轮次
    const currentEpochInfo = await dbGet('SELECT MAX(epoch) as current_epoch FROM Epoch');
    const currentEpoch = currentEpochInfo?.current_epoch || 1;
    
    // 分析轮次间隔
    const intervalAnalysis = epochIntervalStats.map(participant => ({
      ...participant,
      epoch_interval: currentEpoch - (participant.last_win_epoch || 0),
      can_participate: (currentEpoch - (participant.last_win_epoch || 0)) >= 3
    }));
    
    res.json({
      success: true,
      stats: {
        winCountDistribution: winCountStats,
        epochIntervalAnalysis: intervalAnalysis,
        currentEpoch: currentEpoch,
        summary: {
          totalParticipants: winCountStats.reduce((sum, stat) => sum + stat.participant_count, 0),
          neverWon: winCountStats.find(s => s.win_count === 0)?.participant_count || 0,
          wonOnce: winCountStats.find(s => s.win_count === 1)?.participant_count || 0,
          wonTwice: winCountStats.find(s => s.win_count === 2)?.participant_count || 0,
          wonThrice: winCountStats.find(s => s.win_count === 3)?.participant_count || 0,
          eligibleForNextRound: intervalAnalysis.filter(p => p.can_participate).length
        }
      }
    });
  } catch (error) {
    console.error('获取多次中奖统计失败:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

// 获取系统配置
router.get('/system-config', async (req, res) => {
  try {
    const config = await dbGet('SELECT * FROM SystemConfig LIMIT 1');
    
    const defaultConfig = {
      winnerDisplayDelay: 500
    };
    
    const responseConfig = config || defaultConfig;
    
    res.json({
      success: true,
      config: responseConfig
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ error: '获取系统配置失败' });
  }
});

// 更新系统配置
router.post('/system-config', async (req, res) => {
  try {
    const { winnerDisplayDelay } = req.body;
    
    // 验证输入
    if (typeof winnerDisplayDelay !== 'number' || winnerDisplayDelay < 0) {
      return res.status(400).json({ error: '中奖者显示延迟必须是非负数' });
    }
    
    const currentTime = new Date().toISOString();
    
    // 检查是否已存在配置
    const existingConfig = await dbGet('SELECT * FROM SystemConfig LIMIT 1');
    
    if (existingConfig) {
      // 更新现有配置
      await dbRun(
        'UPDATE SystemConfig SET winnerDisplayDelay = ?, updatedAt = ? WHERE id = ?',
        [winnerDisplayDelay, currentTime, existingConfig.id]
      );
    } else {
      // 插入新配置
      await dbRun(
        'INSERT INTO SystemConfig (winnerDisplayDelay, createdAt, updatedAt) VALUES (?, ?, ?)',
        [winnerDisplayDelay, currentTime, currentTime]
      );
    }
    
    res.json({
      success: true,
      message: '系统配置更新成功',
      config: {
        winnerDisplayDelay
      }
    });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ error: '更新系统配置失败' });
  }
});

export default router;
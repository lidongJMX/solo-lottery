import { dbAll, dbGet, dbRun, dbTransaction } from '../database/init.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 测试配置
const TEST_CONFIG = {
  totalTests: 10,        // 总测试次数
  roundsPerTest: 8,      // 每次测试的轮次数
  participantCount: 500, // 每次测试的参与人数
  outputDir: './test-results-500' // 结果输出目录
};

// 创建输出目录
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

// 日志函数
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// 保存测试结果到文件
const saveTestResult = (filename, data) => {
  const filePath = path.join(TEST_CONFIG.outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// 生成测试参与者数据
const generateTestParticipants = async () => {
  try {
    log(`生成${TEST_CONFIG.participantCount}个测试参与者...`);
    
    // 清空现有参与者
    await dbRun('DELETE FROM Participant');
    
    // 生成500个测试参与者
    const departments = ['技术部', '产品部', '运营部', '市场部', '人事部', '财务部', '设计部', '测试部'];
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'];
    const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平', '刚', '桂英'];
    
    const participants = [];
    for (let i = 1; i <= TEST_CONFIG.participantCount; i++) {
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
      const name = `${surname}${givenName}${i.toString().padStart(3, '0')}`;
      const department = departments[Math.floor(Math.random() * departments.length)];
      const weight = Math.floor(Math.random() * 10) + 1; // 1-10的随机权重
      
      participants.push({
        name,
        department,
        weight,
        has_won: 0,
        win_count: 0,
        high_award_level: 100
      });
    }
    
    // 批量插入参与者
    const currentTime = new Date().toISOString();
    for (const participant of participants) {
      await dbRun(
        'INSERT INTO Participant (name, department, weight, has_won, win_count, high_award_level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [participant.name, participant.department, participant.weight, participant.has_won, participant.win_count, participant.high_award_level, currentTime, currentTime]
      );
    }
    
    log(`成功生成${TEST_CONFIG.participantCount}个测试参与者`);
  } catch (error) {
    log('生成测试参与者失败:', error.message);
    throw error;
  }
};

// 重置数据库到初始状态
const resetDatabase = async () => {
  try {
    log('重置数据库到初始状态...');
    
    // 清空中奖记录
    await dbRun('DELETE FROM Winner');
    
    // 生成测试参与者
    await generateTestParticipants();
    
    // 重置奖项剩余数量
    await dbRun('UPDATE Award SET remaining_count = count');
    
    // 重置轮次
    await dbRun('DELETE FROM Epoch');
    await dbRun('INSERT INTO Epoch (epoch, status, createdAt, updatedAt) VALUES (1, 1, ?, ?)', 
      [new Date().toISOString(), new Date().toISOString()]);
    
    log('数据库重置完成');
  } catch (error) {
    log('数据库重置失败:', error.message);
    throw error;
  }
};

// 获取所有奖项
const getAwards = async () => {
  return await dbAll('SELECT * FROM Award ORDER BY level');
};

// 获取所有参与者
const getParticipants = async () => {
  return await dbAll('SELECT * FROM Participant');
};

// 构建抽奖池（复制自lottery.js）
const buildLotteryPool = async (currentEpoch) => {
  // 基础参与者：所有未中奖的员工
  const neverWonParticipants = await dbAll(`
    SELECT p.*, 0 as win_count, 0 as highest_award_level FROM Participant p
    WHERE p.has_won = 0
  `);
  
  // 返场参与者：从最近两轮的中奖者中随机抽取20%
  const maxEpoch = Math.max(1, currentEpoch - 2);
  const recentWinners = await dbAll(`
    SELECT DISTINCT p.*, 
           COUNT(w.id) as win_count,
           MIN(a.level) as highest_award_level
    FROM Participant p
    JOIN Winner w ON p.id = w.participant_id
    JOIN Award a ON w.award_id = a.id
    WHERE w.epoch < ? AND w.epoch >= ?
    GROUP BY p.id
  `, [currentEpoch, maxEpoch]);
  
  // 改进：调整返场参与者比例为60%（最大程度增加重复中奖机会）
  const returnCount = Math.floor(recentWinners.length * 0.6);
  // 改进：使用crypto.randomBytes()进行高质量随机洗牌
  const shuffledRecentWinners = [...recentWinners];
  for (let i = shuffledRecentWinners.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
    const j = Math.floor(randomValue * (i + 1));
    [shuffledRecentWinners[i], shuffledRecentWinners[j]] = [shuffledRecentWinners[j], shuffledRecentWinners[i]];
  }
  const returnParticipants = shuffledRecentWinners.slice(0, returnCount);
  
  return [...neverWonParticipants, ...returnParticipants];
};

// 筛选符合条件的参与者（复制自lottery.js）
const filterEligibleParticipants = async (lotteryPool, award, currentEpoch) => {
  if (lotteryPool.length === 0) return [];
  
  const participantIds = lotteryPool.map(p => p.id);
  const placeholders = participantIds.map(() => '?').join(',');
  
  const participantWinInfo = await dbAll(`
    SELECT 
      p.id,
      p.name,
      p.department,
      p.weight,
      COALESCE(COUNT(w.id), 0) as win_count,
      COALESCE(MIN(a.level), 999) as highest_award_level,
      COALESCE(SUM(CASE WHEN w.epoch = ? THEN 1 ELSE 0 END), 0) as current_round_wins,
      COALESCE(SUM(CASE WHEN w.award_id = ? THEN 1 ELSE 0 END), 0) as same_award_wins
    FROM Participant p
    LEFT JOIN Winner w ON p.id = w.participant_id
    LEFT JOIN Award a ON w.award_id = a.id
    WHERE p.id IN (${placeholders})
    GROUP BY p.id, p.name, p.department, p.weight
  `, [currentEpoch, award.id, ...participantIds]);
  
  const eligible = participantWinInfo.filter(participant => {
    const winCount = participant.win_count || 0;
    const highestAwardLevel = participant.highest_award_level || 999;
    const currentRoundWins = participant.current_round_wins || 0;
    const sameAwardWins = participant.same_award_wins || 0;
    
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
    
    participant.win_count = winCount;
    participant.highest_award_level = highestAwardLevel;
    
    return true;
  });
  
  return eligible;
};

// 根据概率权重选择参与者（复制自lottery.js，增加部门人数权重）
const selectByProbability = (participants) => {
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
    
    // 改进：调整权重影响系数到0.98（最大程度减少对中奖历史的惩罚，实现更多重复中奖）
    weight *= Math.pow(0.98, winCount);
    
    // 中奖等级影响：等级越高（数值越小）权重越低
    if (highestLevel <= 3) {
      weight *= Math.pow(0.5, 4 - highestLevel);
    }
    
    // 部门人数影响：部门人数越多，权重越高（使用对数函数避免权重差异过大）
    const departmentBonus = 1 + Math.log10(departmentSize) * 0.1; // 对数增长，系数0.1控制影响程度
    weight *= departmentBonus;
    
    return Math.max(weight, 1);
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
  
  return participants.pop();
};

// 执行单次抽奖
const performSingleDraw = async (award, epoch) => {
  try {
    // 构建抽奖池
    const lotteryPool = await buildLotteryPool(epoch);
    
    // 筛选符合条件的参与者
    const eligibleParticipants = await filterEligibleParticipants(lotteryPool, award, epoch);
    
    if (eligibleParticipants.length === 0) {
      return null;
    }
    
    // 检查全员中奖机制
    const totalRemainingAwards = await dbGet(`
      SELECT SUM(remaining_count) as total FROM Award WHERE remaining_count > 0
    `);
    const neverWonParticipants = await dbAll(`
      SELECT p.* FROM Participant p
      WHERE p.id NOT IN (SELECT DISTINCT participant_id FROM Winner)
    `);
    
    const isAllWinMode = totalRemainingAwards.total >= neverWonParticipants.length;
    
    // 执行抽奖
    const participantsCopy = [...eligibleParticipants];
    let selectedParticipant;
    
    if (isAllWinMode && neverWonParticipants.some(p => participantsCopy.some(pc => pc.id === p.id))) {
      // 全员中奖模式：优先选择未中奖员工
      const neverWonInPool = participantsCopy.filter(p => 
        neverWonParticipants.some(nw => nw.id === p.id)
      );
      if (neverWonInPool.length > 0) {
        // 改进：使用crypto.randomBytes()进行高质量随机选择
        const randomBytes = crypto.randomBytes(4);
        const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
        const randomIndex = Math.floor(randomValue * neverWonInPool.length);
        selectedParticipant = neverWonInPool[randomIndex];
      } else {
        selectedParticipant = selectByProbability(participantsCopy);
      }
    } else {
      // 正常模式：按概率权重选择
      selectedParticipant = selectByProbability(participantsCopy);
    }
    
    if (!selectedParticipant) {
      return null;
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
        params: [selectedParticipant.id, award.id, epoch, currentTime, currentTime, currentTime]
      },
      {
        sql: 'UPDATE Participant SET has_won = 1, win_count = ?, high_award_level = ?, updatedAt = ? WHERE id = ?',
        params: [newWinCount, newHighLevel, currentTime, selectedParticipant.id]
      },
      {
        sql: 'UPDATE Award SET remaining_count = remaining_count - 1 WHERE id = ?',
        params: [award.id]
      }
    ];
    
    const results = await dbTransaction(transactionOperations);
    
    return {
      id: results[0].lastID,
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      awardId: award.id,
      awardName: award.name,
      awardLevel: award.level,
      epoch: epoch,
      drawTime: currentTime,
      isAllWinMode: isAllWinMode
    };
  } catch (error) {
    log('单次抽奖失败:', error.message);
    return null;
  }
};

// 执行单轮抽奖（所有奖项各抽一次）
const performSingleRound = async (roundNumber) => {
  log(`开始第${roundNumber}轮抽奖`);
  
  const awards = await getAwards();
  const roundResults = [];
  
  // 更新轮次
  await dbRun('UPDATE Epoch SET epoch = ? WHERE epoch_id = (SELECT MAX(epoch_id) FROM Epoch)', [roundNumber]);
  
  for (const award of awards) {
    // 修复：按照draw_count进行多次抽奖
    const drawCount = award.draw_count || 1;
    for (let i = 0; i < drawCount; i++) {
      if (award.remaining_count > 0) {
        const result = await performSingleDraw(award, roundNumber);
        if (result) {
          roundResults.push(result);
          log(`  ${award.name}(${award.level}等奖): ${result.participantName}`);
          // 更新本地的remaining_count以便后续判断
          award.remaining_count--;
        } else {
          log(`  ${award.name}(${award.level}等奖): 无符合条件的参与者`);
          break; // 如果没有符合条件的参与者，跳出当前奖项的抽奖循环
        }
      } else {
        log(`  ${award.name}(${award.level}等奖): 奖项已抽完`);
        break; // 奖项已抽完，跳出循环
      }
    }
  }
  
  log(`第${roundNumber}轮抽奖完成，共产生${roundResults.length}名中奖者`);
  return roundResults;
};

// 执行单次完整测试（8轮抽奖）
const performSingleTest = async (testNumber) => {
  log(`\n=== 开始第${testNumber}次测试（${TEST_CONFIG.participantCount}人参与） ===`);
  
  // 重置数据库
  await resetDatabase();
  
  const testResults = {
    testNumber: testNumber,
    participantCount: TEST_CONFIG.participantCount,
    rounds: [],
    summary: {
      totalWinners: 0,
      winnersByAward: {},
      winnersByRound: {},
      participantWinCounts: {},
      fairnessMetrics: {}
    }
  };
  
  // 执行8轮抽奖
  for (let round = 1; round <= TEST_CONFIG.roundsPerTest; round++) {
    const roundResults = await performSingleRound(round);
    testResults.rounds.push({
      roundNumber: round,
      winners: roundResults
    });
    
    // 统计本轮结果
    testResults.summary.winnersByRound[round] = roundResults.length;
    testResults.summary.totalWinners += roundResults.length;
    
    for (const winner of roundResults) {
      // 按奖项统计
      const awardKey = `${winner.awardLevel}等奖-${winner.awardName}`;
      testResults.summary.winnersByAward[awardKey] = (testResults.summary.winnersByAward[awardKey] || 0) + 1;
      
      // 按参与者统计
      testResults.summary.participantWinCounts[winner.participantName] = 
        (testResults.summary.participantWinCounts[winner.participantName] || 0) + 1;
    }
  }
  
  // 计算公平性指标
  await calculateFairnessMetrics(testResults);
  
  log(`第${testNumber}次测试完成，总中奖人次: ${testResults.summary.totalWinners}`);
  
  // 保存单次测试结果
  saveTestResult(`test-${testNumber}-results.json`, testResults);
  
  return testResults;
};

// 计算公平性指标
const calculateFairnessMetrics = async (testResults) => {
  const participants = await getParticipants();
  const totalParticipants = TEST_CONFIG.participantCount; // 固定为500人
  const winCounts = Object.values(testResults.summary.participantWinCounts);
  const totalWinners = Object.keys(testResults.summary.participantWinCounts).length;
  const totalWins = testResults.summary.totalWinners;
  
  // 基本统计
  const mean = totalWins / totalParticipants;
  const winnerRatio = totalWinners / totalParticipants;
  
  // 中奖次数分布
  const winCountDistribution = {};
  for (let i = 0; i <= 3; i++) {
    winCountDistribution[i] = 0;
  }
  
  // 统计每个参与者的中奖次数（基于500人）
  for (let i = 0; i < totalParticipants; i++) {
    const participantName = participants[i] ? participants[i].name : `虚拟参与者${i}`;
    const winCount = testResults.summary.participantWinCounts[participantName] || 0;
    winCountDistribution[winCount]++;
  }
  
  // 计算方差和标准差
  let variance = 0;
  for (let i = 0; i < totalParticipants; i++) {
    const participantName = participants[i] ? participants[i].name : `虚拟参与者${i}`;
    const winCount = testResults.summary.participantWinCounts[participantName] || 0;
    variance += Math.pow(winCount - mean, 2);
  }
  variance = variance / totalParticipants;
  
  const stdDev = Math.sqrt(variance);
  
  // 计算基尼系数（衡量分配不均程度）
  const sortedWinCounts = [];
  for (let i = 0; i < totalParticipants; i++) {
    const participantName = participants[i] ? participants[i].name : `虚拟参与者${i}`;
    const winCount = testResults.summary.participantWinCounts[participantName] || 0;
    sortedWinCounts.push(winCount);
  }
  sortedWinCounts.sort((a, b) => a - b);
  let giniSum = 0;
  for (let i = 0; i < sortedWinCounts.length; i++) {
    giniSum += (2 * (i + 1) - sortedWinCounts.length - 1) * sortedWinCounts[i];
  }
  const giniCoefficient = giniSum / (sortedWinCounts.length * sortedWinCounts.reduce((a, b) => a + b, 0) || 1);
  
  // 计算偏度和峰度
  let skewness = 0;
  let kurtosis = 0;
  if (stdDev > 0) {
    for (let i = 0; i < totalParticipants; i++) {
      const participantName = participants[i] ? participants[i].name : `虚拟参与者${i}`;
      const winCount = testResults.summary.participantWinCounts[participantName] || 0;
      skewness += Math.pow((winCount - mean) / stdDev, 3);
      kurtosis += Math.pow((winCount - mean) / stdDev, 4);
    }
    skewness = skewness / totalParticipants;
    kurtosis = kurtosis / totalParticipants - 3;
  }
  
  // 计算部门权重效果分析
  const departmentAnalysis = {};
  const departments = ['技术部', '产品部', '运营部', '市场部', '人事部', '财务部', '设计部', '测试部'];
  
  // 统计各部门人数和中奖情况
  for (const dept of departments) {
    const deptParticipants = participants.filter(p => p.department === dept);
    const deptSize = deptParticipants.length;
    
    let deptWins = 0;
    let deptWinners = 0;
    
    for (const participant of deptParticipants) {
      const winCount = testResults.summary.participantWinCounts[participant.name] || 0;
      deptWins += winCount;
      if (winCount > 0) deptWinners++;
    }
    
    const deptWinRate = deptSize > 0 ? (deptWins / (deptSize * TEST_CONFIG.roundsPerTest)) : 0;
    const deptWinnerRate = deptSize > 0 ? (deptWinners / deptSize) : 0;
    const avgWinPerPerson = deptSize > 0 ? (deptWins / deptSize) : 0;
    
    // 计算理论权重系数
    const theoreticalWeight = deptSize > 0 ? (1 + Math.log10(deptSize) * 0.1) : 1;
    
    departmentAnalysis[dept] = {
      size: deptSize,
      totalWins: deptWins,
      uniqueWinners: deptWinners,
      winRate: deptWinRate,
      winnerRate: deptWinnerRate,
      avgWinPerPerson: avgWinPerPerson,
      theoreticalWeight: theoreticalWeight
    };
  }
  
  testResults.summary.fairnessMetrics = {
    totalParticipants,
    totalWinners,
    totalWins,
    mean,
    variance,
    stdDev,
    winnerRatio,
    giniCoefficient,
    skewness,
    kurtosis,
    winCountDistribution,
    isNormalDistribution: Math.abs(skewness) < 1 && Math.abs(kurtosis) < 1,
    departmentAnalysis
  };
};

// 分析所有测试结果
const analyzeAllResults = (allTestResults) => {
  log('\n=== 开始分析所有测试结果 ===');
  
  const analysis = {
    testCount: allTestResults.length,
    participantCount: TEST_CONFIG.participantCount,
    aggregateMetrics: {
      totalWins: 0,
      totalUniqueWinners: new Set(),
      winCountDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
      giniCoefficients: [],
      skewnessValues: [],
      kurtosisValues: [],
      normalDistributionTests: []
    },
    fairnessAssessment: {
      isReasonable: false,
      isNormalDistributed: false,
      isFair: false,
      issues: [],
      recommendations: []
    }
  };
  
  // 初始化部门权重分析
  const departmentWeightAnalysis = {
    departments: ['技术部', '产品部', '运营部', '市场部', '人事部', '财务部', '设计部', '测试部'],
    aggregatedData: {},
    weightEffectiveness: {}
  };
  
  // 聚合所有测试的数据
  for (const testResult of allTestResults) {
    const metrics = testResult.summary.fairnessMetrics;
    
    analysis.aggregateMetrics.totalWins += metrics.totalWins;
    
    // 收集所有中奖者
    Object.keys(testResult.summary.participantWinCounts).forEach(name => {
      analysis.aggregateMetrics.totalUniqueWinners.add(name);
    });
    
    // 聚合分布数据
    Object.keys(metrics.winCountDistribution).forEach(count => {
      analysis.aggregateMetrics.winCountDistribution[count] += metrics.winCountDistribution[count];
    });
    
    // 收集统计指标
    analysis.aggregateMetrics.giniCoefficients.push(metrics.giniCoefficient);
    analysis.aggregateMetrics.skewnessValues.push(metrics.skewness);
    analysis.aggregateMetrics.kurtosisValues.push(metrics.kurtosis);
    analysis.aggregateMetrics.normalDistributionTests.push(metrics.isNormalDistribution);
    
    // 聚合部门权重数据
    if (metrics.departmentAnalysis) {
      for (const dept of departmentWeightAnalysis.departments) {
        if (!departmentWeightAnalysis.aggregatedData[dept]) {
          departmentWeightAnalysis.aggregatedData[dept] = {
            totalSize: 0,
            totalWins: 0,
            totalUniqueWinners: 0,
            winRates: [],
            winnerRates: [],
            avgWinPerPersons: [],
            theoreticalWeights: []
          };
        }
        
        const deptData = metrics.departmentAnalysis[dept];
        if (deptData) {
          departmentWeightAnalysis.aggregatedData[dept].totalSize = deptData.size; // 假设每次测试部门大小相同
          departmentWeightAnalysis.aggregatedData[dept].totalWins += deptData.totalWins;
          departmentWeightAnalysis.aggregatedData[dept].totalUniqueWinners += deptData.uniqueWinners;
          departmentWeightAnalysis.aggregatedData[dept].winRates.push(deptData.winRate);
          departmentWeightAnalysis.aggregatedData[dept].winnerRates.push(deptData.winnerRate);
          departmentWeightAnalysis.aggregatedData[dept].avgWinPerPersons.push(deptData.avgWinPerPerson);
          departmentWeightAnalysis.aggregatedData[dept].theoreticalWeights.push(deptData.theoreticalWeight);
        }
      }
    }
  }
  
  // 计算平均值
  const avgGini = analysis.aggregateMetrics.giniCoefficients.reduce((a, b) => a + b, 0) / analysis.aggregateMetrics.giniCoefficients.length;
  const avgSkewness = analysis.aggregateMetrics.skewnessValues.reduce((a, b) => a + b, 0) / analysis.aggregateMetrics.skewnessValues.length;
  const avgKurtosis = analysis.aggregateMetrics.kurtosisValues.reduce((a, b) => a + b, 0) / analysis.aggregateMetrics.kurtosisValues.length;
  const normalDistributionRatio = analysis.aggregateMetrics.normalDistributionTests.filter(x => x).length / analysis.aggregateMetrics.normalDistributionTests.length;
  
  // 公平性评估
  analysis.fairnessAssessment.isNormalDistributed = normalDistributionRatio >= 0.7;
  analysis.fairnessAssessment.isFair = avgGini < 0.3; // 基尼系数小于0.3认为相对公平
  analysis.fairnessAssessment.isReasonable = analysis.fairnessAssessment.isNormalDistributed && analysis.fairnessAssessment.isFair;
  
  // 问题识别
  if (avgGini > 0.5) {
    analysis.fairnessAssessment.issues.push('基尼系数过高，中奖分配不均严重');
  }
  
  if (Math.abs(avgSkewness) > 2) {
    analysis.fairnessAssessment.issues.push('偏度过大，分布严重偏斜');
  }
  
  if (Math.abs(avgKurtosis) > 2) {
    analysis.fairnessAssessment.issues.push('峰度异常，分布形态不正常');
  }
  
  if (normalDistributionRatio < 0.5) {
    analysis.fairnessAssessment.issues.push('正态分布检验通过率低，随机性不足');
  }
  
  // 改进建议
  if (!analysis.fairnessAssessment.isFair) {
    analysis.fairnessAssessment.recommendations.push('调整权重算法，减少中奖次数对后续中奖概率的影响');
    analysis.fairnessAssessment.recommendations.push('考虑增加中奖次数上限，或调整返场参与者比例');
  }
  
  if (!analysis.fairnessAssessment.isNormalDistributed) {
    analysis.fairnessAssessment.recommendations.push('优化随机数生成算法，提高随机性');
    analysis.fairnessAssessment.recommendations.push('调整抽奖池构建逻辑，确保每轮参与者的多样性');
  }
  
  if (avgGini > 0.4) {
    analysis.fairnessAssessment.recommendations.push('考虑实施更严格的中奖限制，防止少数人重复中奖');
  }
  
  // 计算部门权重效果分析
  for (const dept of departmentWeightAnalysis.departments) {
    const deptData = departmentWeightAnalysis.aggregatedData[dept];
    if (deptData && deptData.winRates.length > 0) {
      const avgWinRate = deptData.winRates.reduce((a, b) => a + b, 0) / deptData.winRates.length;
      const avgWinnerRate = deptData.winnerRates.reduce((a, b) => a + b, 0) / deptData.winnerRates.length;
      const avgWinPerPerson = deptData.avgWinPerPersons.reduce((a, b) => a + b, 0) / deptData.avgWinPerPersons.length;
      const avgTheoreticalWeight = deptData.theoreticalWeights.reduce((a, b) => a + b, 0) / deptData.theoreticalWeights.length;
      
      departmentWeightAnalysis.weightEffectiveness[dept] = {
        size: deptData.totalSize,
        avgWinRate: avgWinRate,
        avgWinnerRate: avgWinnerRate,
        avgWinPerPerson: avgWinPerPerson,
        theoreticalWeight: avgTheoreticalWeight,
        totalWinsAcrossTests: deptData.totalWins,
        totalUniqueWinnersAcrossTests: deptData.totalUniqueWinners
      };
    }
  }
  
  // 计算部门间权重效果对比
  const departmentComparison = [];
  const deptNames = Object.keys(departmentWeightAnalysis.weightEffectiveness);
  
  for (let i = 0; i < deptNames.length; i++) {
    for (let j = i + 1; j < deptNames.length; j++) {
      const dept1 = deptNames[i];
      const dept2 = deptNames[j];
      const data1 = departmentWeightAnalysis.weightEffectiveness[dept1];
      const data2 = departmentWeightAnalysis.weightEffectiveness[dept2];
      
      if (data1 && data2 && data1.size > 0 && data2.size > 0) {
        const sizeRatio = data1.size / data2.size;
        const winRateRatio = data1.avgWinRate / data2.avgWinRate;
        const theoreticalRatio = data1.theoreticalWeight / data2.theoreticalWeight;
        
        departmentComparison.push({
          dept1: dept1,
          dept2: dept2,
          sizeRatio: sizeRatio,
          winRateRatio: winRateRatio,
          theoreticalRatio: theoreticalRatio,
          effectivenessRatio: winRateRatio / theoreticalRatio, // 实际效果与理论效果的比值
          dept1Size: data1.size,
          dept2Size: data2.size,
          dept1WinRate: data1.avgWinRate,
          dept2WinRate: data2.avgWinRate
        });
      }
    }
  }
  
  // 添加统计摘要
  analysis.statisticalSummary = {
    averageGiniCoefficient: avgGini,
    averageSkewness: avgSkewness,
    averageKurtosis: avgKurtosis,
    normalDistributionRatio: normalDistributionRatio,
    totalUniqueWinners: analysis.aggregateMetrics.totalUniqueWinners.size,
    winCountDistribution: analysis.aggregateMetrics.winCountDistribution
  };
  
  // 添加部门权重分析结果
  analysis.departmentWeightAnalysis = {
    departmentEffectiveness: departmentWeightAnalysis.weightEffectiveness,
    departmentComparison: departmentComparison,
    weightingConclusion: {
      isEffective: departmentComparison.some(comp => comp.effectivenessRatio > 0.8 && comp.effectivenessRatio < 1.2),
      averageEffectivenessRatio: departmentComparison.length > 0 ? 
        departmentComparison.reduce((sum, comp) => sum + comp.effectivenessRatio, 0) / departmentComparison.length : 0,
      recommendations: []
    }
  };
  
  // 部门权重效果评估和建议
  const avgEffectiveness = analysis.departmentWeightAnalysis.weightingConclusion.averageEffectivenessRatio;
  if (avgEffectiveness > 1.5) {
    analysis.departmentWeightAnalysis.weightingConclusion.recommendations.push('部门权重效果过强，建议降低权重系数');
  } else if (avgEffectiveness < 0.5) {
    analysis.departmentWeightAnalysis.weightingConclusion.recommendations.push('部门权重效果过弱，建议增加权重系数');
  } else {
    analysis.departmentWeightAnalysis.weightingConclusion.recommendations.push('部门权重效果适中，当前设置合理');
  }
  
  return analysis;
};

// 生成改进意见文档
const generateImprovementReport = (analysis) => {
  const report = `# Solo Lottery 抽奖系统公平性分析报告（500人测试）

## 测试概述

本报告基于 ${analysis.testCount} 次完整测试的结果，每次测试固定 ${analysis.participantCount} 人参与，包含 ${TEST_CONFIG.roundsPerTest} 轮抽奖，分析当前抽奖系统的公平性和合理性。

## 测试结果统计

### 基本数据
- **总测试次数**: ${analysis.testCount}
- **每次测试参与人数**: ${analysis.participantCount}
- **每次测试轮次**: ${TEST_CONFIG.roundsPerTest}
- **总中奖人次**: ${analysis.aggregateMetrics.totalWins}
- **不重复中奖人数**: ${analysis.statisticalSummary.totalUniqueWinners}

### 中奖次数分布
- **未中奖人数**: ${analysis.statisticalSummary.winCountDistribution[0]}
- **中奖1次人数**: ${analysis.statisticalSummary.winCountDistribution[1]}
- **中奖2次人数**: ${analysis.statisticalSummary.winCountDistribution[2]}
- **中奖3次人数**: ${analysis.statisticalSummary.winCountDistribution[3]}

### 统计指标
- **平均基尼系数**: ${analysis.statisticalSummary.averageGiniCoefficient.toFixed(4)}
- **平均偏度**: ${analysis.statisticalSummary.averageSkewness.toFixed(4)}
- **平均峰度**: ${analysis.statisticalSummary.averageKurtosis.toFixed(4)}
- **正态分布检验通过率**: ${(analysis.statisticalSummary.normalDistributionRatio * 100).toFixed(1)}%

## 公平性评估

### 总体评价
- **系统合理性**: ${analysis.fairnessAssessment.isReasonable ? '✅ 合理' : '❌ 不合理'}
- **分布正态性**: ${analysis.fairnessAssessment.isNormalDistributed ? '✅ 符合正态分布' : '❌ 不符合正态分布'}
- **公平性**: ${analysis.fairnessAssessment.isFair ? '✅ 相对公平' : '❌ 存在不公平现象'}

### 评估标准
- **基尼系数**: < 0.3 (相对公平), 0.3-0.5 (中等不公平), > 0.5 (严重不公平)
- **正态分布**: 偏度和峰度的绝对值均 < 1
- **随机性**: 正态分布检验通过率 > 70%

## 发现的问题

${analysis.fairnessAssessment.issues.length > 0 ? 
  analysis.fairnessAssessment.issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n') : 
  '✅ 未发现明显问题'}

## 改进建议

${analysis.fairnessAssessment.recommendations.length > 0 ? 
  analysis.fairnessAssessment.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n') : 
  '✅ 当前系统运行良好，无需特别改进'}

## 详细分析

### 基尼系数分析
基尼系数衡量中奖分配的不均程度，当前平均值为 ${analysis.statisticalSummary.averageGiniCoefficient.toFixed(4)}。

${analysis.statisticalSummary.averageGiniCoefficient < 0.3 ? 
  '✅ 基尼系数较低，表明中奖分配相对均匀，系统公平性良好。' : 
  analysis.statisticalSummary.averageGiniCoefficient < 0.5 ? 
  '⚠️ 基尼系数中等，存在一定程度的分配不均，建议优化抽奖算法。' : 
  '❌ 基尼系数过高，分配严重不均，需要重新设计抽奖规则。'}

### 分布形态分析
- **偏度**: ${analysis.statisticalSummary.averageSkewness.toFixed(4)} ${Math.abs(analysis.statisticalSummary.averageSkewness) < 1 ? '(正常)' : '(异常)'}
- **峰度**: ${analysis.statisticalSummary.averageKurtosis.toFixed(4)} ${Math.abs(analysis.statisticalSummary.averageKurtosis) < 1 ? '(正常)' : '(异常)'}

${analysis.fairnessAssessment.isNormalDistributed ? 
  '✅ 分布形态接近正态分布，随机性良好。' : 
  '❌ 分布形态偏离正态分布，随机性不足，建议检查随机数生成算法。'}

### 随机性分析
正态分布检验通过率为 ${(analysis.statisticalSummary.normalDistributionRatio * 100).toFixed(1)}%。

${analysis.statisticalSummary.normalDistributionRatio >= 0.7 ? 
  '✅ 通过率较高，系统随机性良好。' : 
  analysis.statisticalSummary.normalDistributionRatio >= 0.5 ? 
  '⚠️ 通过率中等，建议进一步优化随机性。' : 
  '❌ 通过率较低，随机性不足，需要改进随机算法。'}

## 500人测试的特殊意义

相比之前的测试，固定500人参与的测试具有以下优势：
1. **样本一致性**: 每次测试都使用相同数量的参与者，消除了样本大小变化的影响
2. **统计可靠性**: 500人的样本量足够大，能够提供更可靠的统计分析结果
3. **公平性基准**: 建立了统一的公平性评估基准，便于不同测试间的比较
4. **实际应用性**: 500人规模接近实际企业抽奖场景，测试结果更具实用价值

## 技术建议

### 算法优化
1. **权重调整**: 考虑调整中奖次数对权重的影响系数，当前为0.7的幂次，可以尝试0.8或0.9
2. **返场比例**: 当前返场参与者比例为20%，可以根据测试结果调整为15%或25%
3. **随机数生成**: 考虑使用更高质量的随机数生成器，如crypto.randomBytes()

### 规则优化
1. **中奖限制**: 当前最多中奖3次，在500人规模下可以考虑动态调整
2. **等级限制**: 考虑放宽一、二等奖的重复中奖限制，或增加更细粒度的等级控制
3. **轮次机制**: 可以考虑增加轮次间的冷却期，减少连续中奖的可能性

## 结论

${analysis.fairnessAssessment.isReasonable ? 
  '基于500人固定参与的测试结果显示，当前抽奖系统整体设计合理，公平性良好，能够有效保证抽奖的随机性和公正性。建议继续使用当前规则，并定期进行公平性测试。' : 
  '基于500人固定参与的测试结果显示，当前抽奖系统存在一定的公平性问题，建议根据上述分析和建议进行相应的优化改进，以提高系统的公平性和用户满意度。'}

---

*报告生成时间: ${new Date().toLocaleString()}*
*测试数据路径: ${TEST_CONFIG.outputDir}*
*测试规模: ${analysis.participantCount}人 × ${analysis.testCount}次测试*
`;

  return report;
};

// 主测试函数
const runFairnessTest = async () => {
  try {
    log('=== Solo Lottery 抽奖系统公平性测试开始（500人固定参与） ===');
    log(`配置: ${TEST_CONFIG.totalTests}次测试，每次${TEST_CONFIG.participantCount}人参与，${TEST_CONFIG.roundsPerTest}轮抽奖`);
    
    const allTestResults = [];
    
    // 执行所有测试
    for (let i = 1; i <= TEST_CONFIG.totalTests; i++) {
      const testResult = await performSingleTest(i);
      allTestResults.push(testResult);
      
      // 每次测试后稍作延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 保存所有测试结果
    saveTestResult('all-test-results.json', allTestResults);
    
    // 分析结果
    const analysis = analyzeAllResults(allTestResults);
    saveTestResult('fairness-analysis.json', analysis);
    
    // 生成改进意见报告
    const report = generateImprovementReport(analysis);
    fs.writeFileSync(path.join(TEST_CONFIG.outputDir, '改进意见-500人测试.md'), report, 'utf8');
    
    log('\n=== 测试完成 ===');
    log(`测试结果已保存到: ${TEST_CONFIG.outputDir}`);
    log('主要文件:');
    log('- all-test-results.json: 所有测试的详细结果');
    log('- fairness-analysis.json: 公平性分析数据');
    log('- 改进意见-500人测试.md: 分析报告和改进建议');
    log('- test-X-results.json: 各次测试的详细结果');
    
    // 输出简要结论
    log('\n=== 简要结论（500人测试） ===');
    log(`参与人数: ${TEST_CONFIG.participantCount}人（每次测试）`);
    log(`系统合理性: ${analysis.fairnessAssessment.isReasonable ? '合理' : '不合理'}`);
    log(`分布正态性: ${analysis.fairnessAssessment.isNormalDistributed ? '符合' : '不符合'}`);
    log(`公平性: ${analysis.fairnessAssessment.isFair ? '相对公平' : '存在问题'}`);
    log(`平均基尼系数: ${analysis.statisticalSummary.averageGiniCoefficient.toFixed(4)}`);
    log(`正态分布通过率: ${(analysis.statisticalSummary.normalDistributionRatio * 100).toFixed(1)}%`);
    
    if (analysis.fairnessAssessment.issues.length > 0) {
      log('\n主要问题:');
      analysis.fairnessAssessment.issues.forEach((issue, index) => {
        log(`${index + 1}. ${issue}`);
      });
    }
    
    if (analysis.fairnessAssessment.recommendations.length > 0) {
      log('\n改进建议:');
      analysis.fairnessAssessment.recommendations.forEach((rec, index) => {
        log(`${index + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    log('测试过程中发生错误:', error.message);
    console.error(error);
  }
};

// 运行测试
runFairnessTest();
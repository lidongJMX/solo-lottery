import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// 配置
const BASE_URL = 'http://localhost:3001/api';
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');

// 创建测试结果目录
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// 工具函数
const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
};

const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 保存测试结果到文件
const saveTestResult = (filename, data) => {
  const filePath = path.join(TEST_RESULTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  log(`测试结果已保存到: ${filePath}`);
};

// 测试抽奖基础功能
const testLotteryBasics = async () => {
  log('=== 开始测试抽奖基础功能 ===');
  
  try {
    // 1. 获取抽奖状态
    log('1. 获取抽奖状态');
    const { status: statusCode, data: lotteryStatus } = await apiRequest('/lottery/status');
    log(`抽奖状态码: ${statusCode}`, lotteryStatus);
    saveTestResult('lottery-status.json', lotteryStatus);
    
    // 2. 获取所有中奖记录
    log('2. 获取所有中奖记录');
    const { status: winnersStatus, data: allWinners } = await apiRequest('/lottery/winners');
    log(`中奖记录状态码: ${winnersStatus}`, { count: allWinners.length, sample: allWinners.slice(0, 3) });
    saveTestResult('all-winners.json', allWinners);
    
    // 3. 获取可用奖项
    log('3. 获取可用奖项');
    const { status: awardsStatus, data: awards } = await apiRequest('/awards');
    const availableAwards = awards.filter(award => award.remaining_count > 0);
    log(`可用奖项状态码: ${awardsStatus}`, { total: awards.length, available: availableAwards.length });
    
    return { lotteryStatus, allWinners, awards, availableAwards };
    
  } catch (error) {
    log('抽奖基础功能测试出错:', error.message);
    return null;
  }
};

// 测试抽奖执行功能
const testLotteryExecution = async () => {
  log('=== 开始测试抽奖执行功能 ===');
  
  try {
    // 获取可用奖项
    const { status: awardsStatus, data: awards } = await apiRequest('/awards');
    const availableAwards = awards.filter(award => award.remaining_count > 0);
    
    if (availableAwards.length === 0) {
      log('没有可用奖项，跳过抽奖测试');
      return;
    }
    
    // 选择第一个可用奖项进行测试
    const testAward = availableAwards[0];
    log(`选择奖项进行测试:`, testAward);
    
    // 1. 执行抽奖
    log('1. 执行抽奖');
    const drawRequest = {
      awardId: testAward.id,
      count: Math.min(testAward.draw_count, testAward.remaining_count)
    };
    
    const { status: drawStatus, data: drawResult } = await apiRequest('/lottery/draw', {
      method: 'POST',
      body: JSON.stringify(drawRequest)
    });
    
    log(`抽奖状态码: ${drawStatus}`, drawResult);
    saveTestResult(`draw-result-${Date.now()}.json`, drawResult);
    
    if (drawStatus === 200 && drawResult.winners) {
      // 2. 获取特定奖项的中奖记录
      log('2. 获取特定奖项的中奖记录');
      const { status: awardWinnersStatus, data: awardWinners } = await apiRequest(`/lottery/winners?awardId=${testAward.id}`);
      log(`特定奖项中奖记录状态码: ${awardWinnersStatus}`, { count: awardWinners.length });
      
      // 3. 测试撤销中奖记录（如果有中奖者）
      if (drawResult.winners.length > 0) {
        const firstWinner = drawResult.winners[0];
        log('3. 测试撤销中奖记录');
        
        const { status: revokeStatus, data: revokeResult } = await apiRequest(`/lottery/winners/${firstWinner.id}`, {
          method: 'DELETE'
        });
        log(`撤销中奖状态码: ${revokeStatus}`, revokeResult);
        
        // 等待一下再重新抽奖
        await delay(1000);
        
        // 4. 重新抽奖
        log('4. 重新抽奖');
        const { status: redrawStatus, data: redrawResult } = await apiRequest('/lottery/draw', {
          method: 'POST',
          body: JSON.stringify(drawRequest)
        });
        log(`重新抽奖状态码: ${redrawStatus}`, redrawResult);
      }
    }
    
  } catch (error) {
    log('抽奖执行功能测试出错:', error.message);
  }
};

// 测试轮次管理功能
const testRoundManagement = async () => {
  log('=== 开始测试轮次管理功能 ===');
  
  try {
    // 1. 获取当前轮次状态
    log('1. 获取当前轮次状态');
    const { status: statusCode, data: currentStatus } = await apiRequest('/lottery/status');
    log(`当前状态码: ${statusCode}`, currentStatus);
    
    const currentRound = currentStatus.currentRound;
    
    // 2. 进入下一轮
    log('2. 进入下一轮');
    const { status: nextRoundStatus, data: nextRoundResult } = await apiRequest('/lottery/next-round', {
      method: 'POST'
    });
    log(`下一轮状态码: ${nextRoundStatus}`, nextRoundResult);
    
    // 3. 再次获取状态确认轮次变化
    log('3. 确认轮次变化');
    const { status: newStatusCode, data: newStatus } = await apiRequest('/lottery/status');
    log(`新状态码: ${newStatusCode}`, newStatus);
    
    if (newStatus.currentRound !== currentRound) {
      log(`轮次成功从 ${currentRound} 变更为 ${newStatus.currentRound}`);
    } else {
      log('轮次未发生变化，可能存在问题');
    }
    
  } catch (error) {
    log('轮次管理功能测试出错:', error.message);
  }
};

// 测试重置功能
const testResetFunction = async () => {
  log('=== 开始测试重置功能 ===');
  
  try {
    // 1. 获取重置前的状态
    log('1. 获取重置前的状态');
    const { status: beforeStatus, data: beforeData } = await apiRequest('/lottery/status');
    const { status: winnersStatus, data: winnersData } = await apiRequest('/lottery/winners');
    
    log('重置前状态:', beforeData);
    log('重置前中奖记录数量:', winnersData.length);
    
    // 2. 执行重置
    log('2. 执行重置操作');
    const { status: resetStatus, data: resetResult } = await apiRequest('/lottery/reset', {
      method: 'POST'
    });
    log(`重置状态码: ${resetStatus}`, resetResult);
    
    // 3. 获取重置后的状态
    log('3. 获取重置后的状态');
    const { status: afterStatus, data: afterData } = await apiRequest('/lottery/status');
    const { status: afterWinnersStatus, data: afterWinnersData } = await apiRequest('/lottery/winners');
    
    log('重置后状态:', afterData);
    log('重置后中奖记录数量:', afterWinnersData.length);
    
    // 4. 验证重置效果
    const resetEffective = {
      roundReset: afterData.currentRound === 1,
      winnersCleared: afterWinnersData.length === 0,
      awardsReset: afterData.awards.every(award => award.remaining_count === award.count)
    };
    
    log('重置效果验证:', resetEffective);
    saveTestResult('reset-verification.json', {
      before: { status: beforeData, winners: winnersData.length },
      after: { status: afterData, winners: afterWinnersData.length },
      verification: resetEffective
    });
    
  } catch (error) {
    log('重置功能测试出错:', error.message);
  }
};

// 测试抽奖规则和边界情况
const testLotteryRules = async () => {
  log('=== 开始测试抽奖规则和边界情况 ===');
  
  try {
    // 1. 测试无效奖项ID
    log('1. 测试无效奖项ID');
    const { status: invalidStatus, data: invalidResult } = await apiRequest('/lottery/draw', {
      method: 'POST',
      body: JSON.stringify({ awardId: 99999, count: 1 })
    });
    log(`无效奖项ID状态码: ${invalidStatus}`, invalidResult);
    
    // 2. 测试抽取数量为0
    const { status: awardsStatus, data: awards } = await apiRequest('/awards');
    const availableAward = awards.find(award => award.remaining_count > 0);
    
    if (availableAward) {
      log('2. 测试抽取数量为0');
      const { status: zeroCountStatus, data: zeroCountResult } = await apiRequest('/lottery/draw', {
        method: 'POST',
        body: JSON.stringify({ awardId: availableAward.id, count: 0 })
      });
      log(`抽取数量为0状态码: ${zeroCountStatus}`, zeroCountResult);
      
      // 3. 测试超出剩余数量
      log('3. 测试超出剩余数量');
      const { status: exceedStatus, data: exceedResult } = await apiRequest('/lottery/draw', {
        method: 'POST',
        body: JSON.stringify({ awardId: availableAward.id, count: availableAward.remaining_count + 10 })
      });
      log(`超出剩余数量状态码: ${exceedStatus}`, exceedResult);
    }
    
    // 4. 测试获取不存在的中奖记录
    log('4. 测试删除不存在的中奖记录');
    const { status: notFoundStatus, data: notFoundResult } = await apiRequest('/lottery/winners/99999', {
      method: 'DELETE'
    });
    log(`删除不存在记录状态码: ${notFoundStatus}`, notFoundResult);
    
  } catch (error) {
    log('抽奖规则测试出错:', error.message);
  }
};

// 性能测试
const testPerformance = async () => {
  log('=== 开始性能测试 ===');
  
  try {
    const performanceResults = [];
    
    // 1. 测试状态查询性能
    log('1. 测试状态查询性能');
    const statusTimes = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await apiRequest('/lottery/status');
      const end = Date.now();
      statusTimes.push(end - start);
    }
    
    const avgStatusTime = statusTimes.reduce((a, b) => a + b, 0) / statusTimes.length;
    log(`状态查询平均耗时: ${avgStatusTime.toFixed(2)}ms`);
    performanceResults.push({ test: 'status_query', avgTime: avgStatusTime, times: statusTimes });
    
    // 2. 测试中奖记录查询性能
    log('2. 测试中奖记录查询性能');
    const winnersTimes = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await apiRequest('/lottery/winners');
      const end = Date.now();
      winnersTimes.push(end - start);
    }
    
    const avgWinnersTime = winnersTimes.reduce((a, b) => a + b, 0) / winnersTimes.length;
    log(`中奖记录查询平均耗时: ${avgWinnersTime.toFixed(2)}ms`);
    performanceResults.push({ test: 'winners_query', avgTime: avgWinnersTime, times: winnersTimes });
    
    saveTestResult('performance-test.json', performanceResults);
    
  } catch (error) {
    log('性能测试出错:', error.message);
  }
};

// 主测试函数
const runLotteryTests = async () => {
  log('开始执行抽奖页功能测试');
  
  try {
    const basicResults = await testLotteryBasics();
    
    if (basicResults) {
      await testLotteryExecution();
      await testRoundManagement();
      await testLotteryRules();
      await testPerformance();
      
      // 最后测试重置功能（会清空所有数据）
      const shouldTestReset = process.argv.includes('--include-reset');
      if (shouldTestReset) {
        log('检测到 --include-reset 参数，将执行重置测试');
        await testResetFunction();
      } else {
        log('跳过重置测试（使用 --include-reset 参数来启用重置测试）');
      }
    }
    
    log('=== 抽奖页功能测试完成 ===');
  } catch (error) {
    log('测试执行出错:', error.message);
  }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runLotteryTests();
}

export { 
  runLotteryTests, 
  testLotteryBasics, 
  testLotteryExecution, 
  testRoundManagement, 
  testResetFunction, 
  testLotteryRules, 
  testPerformance 
};
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// 配置
const BASE_URL = 'http://localhost:3001/api';
const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');

// 创建测试数据目录
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
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

// 测试奖项管理功能
const testAwardManagement = async () => {
  log('=== 开始测试奖项管理功能 ===');
  
  try {
    // 1. 获取所有奖项
    log('1. 获取所有奖项');
    const { status: getStatus, data: awards } = await apiRequest('/awards');
    log(`状态码: ${getStatus}`, awards);
    
    // 2. 添加测试奖项
    log('2. 添加测试奖项');
    const newAward = {
      name: '测试特等奖',
      description: '这是一个测试奖项',
      level: 1,
      count: 5,
      draw_count: 1
    };
    const { status: addStatus, data: addedAward } = await apiRequest('/awards', {
      method: 'POST',
      body: JSON.stringify(newAward)
    });
    log(`添加奖项状态码: ${addStatus}`, addedAward);
    
    if (addStatus === 201) {
      const awardId = addedAward.id;
      
      // 3. 更新奖项信息
      log('3. 更新奖项信息');
      const updatedAward = {
        ...newAward,
        name: '测试特等奖（已更新）',
        count: 10
      };
      const { status: updateStatus, data: updatedData } = await apiRequest(`/awards/${awardId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedAward)
      });
      log(`更新奖项状态码: ${updateStatus}`, updatedData);
      
      // 4. 获取单个奖项
      log('4. 获取单个奖项');
      const { status: getSingleStatus, data: singleAward } = await apiRequest(`/awards/${awardId}`);
      log(`获取单个奖项状态码: ${getSingleStatus}`, singleAward);
      
      // 5. 删除奖项
      log('5. 删除测试奖项');
      const { status: deleteStatus, data: deleteData } = await apiRequest(`/awards/${awardId}`, {
        method: 'DELETE'
      });
      log(`删除奖项状态码: ${deleteStatus}`, deleteData);
    }
    
  } catch (error) {
    log('奖项管理测试出错:', error.message);
  }
};

// 测试参与者管理功能
const testParticipantManagement = async () => {
  log('=== 开始测试参与者管理功能 ===');
  
  try {
    // 1. 获取所有参与者
    log('1. 获取所有参与者');
    const { status: getStatus, data: participants } = await apiRequest('/participants');
    log(`状态码: ${getStatus}`, { count: participants.length, sample: participants.slice(0, 3) });
    
    // 2. 添加测试参与者
    log('2. 添加测试参与者');
    const newParticipant = {
      name: '测试员工001',
      department: '测试部门',
      phone: '13800138000',
      email: 'test001@example.com'
    };
    const { status: addStatus, data: addedParticipant } = await apiRequest('/participants', {
      method: 'POST',
      body: JSON.stringify(newParticipant)
    });
    log(`添加参与者状态码: ${addStatus}`, addedParticipant);
    
    if (addStatus === 201) {
      const participantId = addedParticipant.id;
      
      // 3. 更新参与者信息
      log('3. 更新参与者信息');
      const updatedParticipant = {
        ...newParticipant,
        name: '测试员工001（已更新）',
        department: '测试部门（已更新）'
      };
      const { status: updateStatus, data: updatedData } = await apiRequest(`/participants/${participantId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedParticipant)
      });
      log(`更新参与者状态码: ${updateStatus}`, updatedData);
      
      // 4. 删除参与者
      log('4. 删除测试参与者');
      const { status: deleteStatus, data: deleteData } = await apiRequest(`/participants/${participantId}`, {
        method: 'DELETE'
      });
      log(`删除参与者状态码: ${deleteStatus}`, deleteData);
    }
    
    // 5. 测试批量导入（创建测试CSV文件）
    log('5. 测试批量导入功能');
    const csvContent = `name,department,user_id\n测试员工A,技术部,001\n测试员工B,市场部,002\n测试员工C,人事部,003`;
    const csvPath = path.join(TEST_DATA_DIR, 'test-participants.csv');
    fs.writeFileSync(csvPath, csvContent);
    
    // 注意：这里只是创建了测试文件，实际的文件上传测试需要使用FormData
    log('CSV测试文件已创建:', csvPath);
    
    // 6. 获取可参与抽奖的人员
    log('6. 获取可参与抽奖的人员');
    const { status: availableStatus, data: availableParticipants } = await apiRequest('/participants/available');
    log(`可参与抽奖人员状态码: ${availableStatus}`, { count: availableParticipants.length });
    
  } catch (error) {
    log('参与者管理测试出错:', error.message);
  }
};

// 测试系统状态和配置
const testSystemStatus = async () => {
  log('=== 开始测试系统状态 ===');
  
  try {
    // 1. 获取抽奖状态
    log('1. 获取抽奖状态');
    const { status: statusCode, data: lotteryStatus } = await apiRequest('/lottery/status');
    log(`抽奖状态码: ${statusCode}`, lotteryStatus);
    
    // 2. 获取奖项配置
    log('2. 获取奖项配置');
    const { status: configStatus, data: awardConfig } = await apiRequest('/awards/config');
    log(`奖项配置状态码: ${configStatus}`, awardConfig);
    
    // 3. 获取参与者姓名列表
    log('3. 获取参与者姓名列表');
    const { status: namesStatus, data: names } = await apiRequest('/participants/names');
    log(`参与者姓名状态码: ${namesStatus}`, { count: names.length, sample: names.slice(0, 10) });
    
  } catch (error) {
    log('系统状态测试出错:', error.message);
  }
};

// 主测试函数
const runAdminTests = async () => {
  log('开始执行管理页功能测试');
  
  try {
    await testSystemStatus();
    await testAwardManagement();
    await testParticipantManagement();
    
    log('=== 管理页功能测试完成 ===');
  } catch (error) {
    log('测试执行出错:', error.message);
  }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdminTests();
}

export { runAdminTests, testAwardManagement, testParticipantManagement, testSystemStatus };
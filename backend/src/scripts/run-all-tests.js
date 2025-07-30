import { runAdminTests } from './test-admin-functions.js';
import { runLotteryTests } from './test-lottery-functions.js';
import fs from 'fs';
import path from 'path';

// 配置
const REPORTS_DIR = path.join(process.cwd(), 'test-reports');

// 创建测试报告目录
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// 工具函数
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const generateTestReport = (testResults) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `test-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(t => t.status === 'passed').length,
      failed: testResults.filter(t => t.status === 'failed').length,
      duration: testResults.reduce((sum, t) => sum + (t.duration || 0), 0)
    },
    details: testResults
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`测试报告已生成: ${reportPath}`);
  
  return report;
};

// 检查服务器连接
const checkServerConnection = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/lottery/status');
    if (response.ok) {
      log('✅ 后端服务连接正常');
      return true;
    } else {
      log('❌ 后端服务响应异常:', response.status);
      return false;
    }
  } catch (error) {
    log('❌ 无法连接到后端服务:', error.message);
    log('请确保后端服务已启动 (npm run dev 或 node src/app.js)');
    return false;
  }
};

// 执行单个测试套件
const runTestSuite = async (name, testFunction) => {
  const startTime = Date.now();
  log(`\n🚀 开始执行 ${name} 测试套件`);
  
  try {
    await testFunction();
    const duration = Date.now() - startTime;
    log(`✅ ${name} 测试套件完成，耗时: ${duration}ms`);
    return { name, status: 'passed', duration, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${name} 测试套件失败，耗时: ${duration}ms`);
    log('错误详情:', error.message);
    return { name, status: 'failed', duration, error: error.message };
  }
};

// 主测试函数
const runAllTests = async () => {
  log('='.repeat(60));
  log('🎯 Solo Lottery 系统功能测试开始');
  log('='.repeat(60));
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  const includeReset = args.includes('--include-reset');
  const adminOnly = args.includes('--admin-only');
  const lotteryOnly = args.includes('--lottery-only');
  
  log('测试配置:');
  log(`- 包含重置测试: ${includeReset ? '是' : '否'}`);
  log(`- 仅管理功能: ${adminOnly ? '是' : '否'}`);
  log(`- 仅抽奖功能: ${lotteryOnly ? '是' : '否'}`);
  
  // 检查服务器连接
  const serverOk = await checkServerConnection();
  if (!serverOk) {
    log('\n❌ 测试终止：无法连接到后端服务');
    process.exit(1);
  }
  
  const testResults = [];
  const overallStartTime = Date.now();
  
  try {
    // 执行管理功能测试
    if (!lotteryOnly) {
      const adminResult = await runTestSuite('管理页功能', runAdminTests);
      testResults.push(adminResult);
    }
    
    // 执行抽奖功能测试
    if (!adminOnly) {
      const lotteryResult = await runTestSuite('抽奖页功能', runLotteryTests);
      testResults.push(lotteryResult);
    }
    
    // 生成测试报告
    const overallDuration = Date.now() - overallStartTime;
    const report = generateTestReport(testResults);
    
    // 输出测试总结
    log('\n' + '='.repeat(60));
    log('📊 测试总结');
    log('='.repeat(60));
    log(`总测试套件: ${report.summary.totalTests}`);
    log(`通过: ${report.summary.passed}`);
    log(`失败: ${report.summary.failed}`);
    log(`总耗时: ${overallDuration}ms`);
    
    if (report.summary.failed > 0) {
      log('\n❌ 部分测试失败，请查看详细日志');
      testResults.filter(t => t.status === 'failed').forEach(test => {
        log(`- ${test.name}: ${test.error}`);
      });
      process.exit(1);
    } else {
      log('\n✅ 所有测试通过！');
    }
    
  } catch (error) {
    log('\n❌ 测试执行过程中发生严重错误:', error.message);
    process.exit(1);
  }
};

// 显示帮助信息
const showHelp = () => {
  console.log(`
🎯 Solo Lottery 测试脚本使用说明
`);
  console.log('用法: node run-all-tests.js [选项]\n');
  console.log('选项:');
  console.log('  --help              显示此帮助信息');
  console.log('  --admin-only        仅执行管理功能测试');
  console.log('  --lottery-only      仅执行抽奖功能测试');
  console.log('  --include-reset     包含重置功能测试（会清空所有数据）');
  console.log('\n示例:');
  console.log('  node run-all-tests.js                    # 执行所有测试（不包含重置）');
  console.log('  node run-all-tests.js --admin-only       # 仅测试管理功能');
  console.log('  node run-all-tests.js --include-reset    # 执行所有测试包含重置');
  console.log('\n注意:');
  console.log('  - 请确保后端服务已启动 (端口 3001)');
  console.log('  - 重置测试会清空所有抽奖数据，请谨慎使用');
  console.log('  - 测试结果将保存在 test-reports 目录中\n');
};

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, runTestSuite, checkServerConnection };
<template>
  <div class="admin-container">
    <!-- 顶部导航栏 -->
    <header class="admin-header">
      <div class="header-content">
        <div class="logo-section">
          <h1 class="admin-title">
            <el-icon class="title-icon"><Setting /></el-icon>
            抽奖系统管理后台
          </h1>
        </div>
        <div class="user-section">
          <el-dropdown>
            <span class="user-info">
              <el-icon><User /></el-icon>
              管理员
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <div class="admin-main">
      <!-- 侧边栏 -->
      <aside class="admin-sidebar">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          @select="handleMenuSelect"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="participants">
            <el-icon><User /></el-icon>
            <span>参与者管理</span>
          </el-menu-item>
          <el-menu-item index="prizes">
            <el-icon><Trophy /></el-icon>
            <span>奖项管理</span>
          </el-menu-item>
          <el-menu-item index="lottery">
            <el-icon><MagicStick /></el-icon>
            <span>抽奖记录</span>
          </el-menu-item>
          <el-menu-item index="settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 内容区域 -->
      <main class="admin-content">
        <!-- 仪表盘 -->
        <div v-if="activeMenu === 'dashboard'" class="dashboard">
          <h2 class="section-title">数据统计</h2>
          
          <!-- 统计卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon participants">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-content">
                <h3>总参与人数</h3>
                <p class="stat-number">{{ statistics.totalParticipants }}</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon prizes">
                <el-icon><Trophy /></el-icon>
              </div>
              <div class="stat-content">
                <h3>奖品总数</h3>
                <p class="stat-number">{{ statistics.totalPrizes }}</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon winners">
                <el-icon><Star /></el-icon>
              </div>
              <div class="stat-content">
                <h3>中奖人数</h3>
                <p class="stat-number">{{ statistics.totalWinners }}</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon rate">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-content">
                <h3>中奖率</h3>
                <p class="stat-number">{{ winningRate }}%</p>
              </div>
            </div>
          </div>

          <!-- 图表区域 -->
          <div class="charts-section">
            <div class="chart-card">
              <h3>奖品分布统计</h3>
              <div class="chart-placeholder">
                <el-icon class="chart-icon"><Histogram /></el-icon>
                <p>饼图：各等级奖品数量分布</p>
              </div>
            </div>
            
            <div class="chart-card">
              <h3>抽奖活动趋势</h3>
              <div class="chart-placeholder">
                <el-icon class="chart-icon"><Monitor /></el-icon>
                <p>折线图：每日抽奖活动数量</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 参与者管理 -->
        <div v-if="activeMenu === 'participants'" class="participants">
          <div class="section-header">
            <h2 class="section-title">参与者管理</h2>
            <div class="action-buttons">
              <el-button type="primary" @click="showImportDialog = true">
                <el-icon><Upload /></el-icon>
                导入名单
              </el-button>
              <el-button type="success" @click="exportParticipants">
                <el-icon><Download /></el-icon>
                导出名单
              </el-button>
              <el-button type="warning" @click="clearParticipants">
                <el-icon><Delete /></el-icon>
                清空名单
              </el-button>
            </div>
          </div>
          
          <!-- 参与者列表 -->
          <div class="table-container">
            <el-table :data="participants" style="width: 100%" stripe>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="department" label="部门" width="150" />
              <el-table-column prop="phone" label="联系电话" width="130" />
              <el-table-column prop="email" label="邮箱" width="200" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.status === '已中奖' ? 'success' : 'info'">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button size="small" @click="editParticipant(scope.row)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteParticipant(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 奖项管理 -->
        <div v-if="activeMenu === 'prizes'" class="prizes">
          <div class="section-header">
            <h2 class="section-title">奖项管理</h2>
            <el-button type="primary" @click="showPrizeDialog = true">
              <el-icon><Plus /></el-icon>
              添加奖项
            </el-button>
          </div>
          
          <div class="table-container">
            <el-table :data="prizes" style="width: 100%" stripe>
              <el-table-column prop="id" label="序号" width="80" align="center" />
              <el-table-column prop="level" label="奖项名称" width="120" align="center">
                <template #default="scope">
                  <el-tag :type="getPrizeTagType(scope.row.level)" size="large">
                    {{ scope.row.level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="奖项描述" min-width="200" />
              <el-table-column prop="quantity" label="总数量" width="100" align="center" />
              <el-table-column label="剩余数量" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.quantity - scope.row.drawn }}
                </template>
              </el-table-column>
              <el-table-column prop="prizeLevel" label="奖项等级" width="120" align="center">
                <template #default="scope">
                  <el-tag :type="getPrizeTagType(scope.row.prizeLevel || scope.row.level)">
                    {{ scope.row.prizeLevel || scope.row.level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="drawCount" label="一次抽取人数" width="140" align="center" />
              <el-table-column label="操作" width="150" align="center">
                <template #default="scope">
                  <el-button size="small" type="primary" link @click="editPrize(scope.row)">编辑</el-button>
                  <el-button size="small" type="danger" link @click="deletePrize(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 抽奖记录 -->
        <div v-if="activeMenu === 'lottery'" class="lottery-records">
          <div class="section-header">
            <h2 class="section-title">抽奖记录</h2>
            <div class="action-buttons">
              <el-button type="success" @click="exportWinners">
                <el-icon><Download /></el-icon>
                导出中奖名单
              </el-button>
              <el-button type="warning" @click="clearRecords">
                <el-icon><Delete /></el-icon>
                清空记录
              </el-button>
            </div>
          </div>
          
          <div class="table-container">
            <el-table :data="lotteryRecords" style="width: 100%" stripe>
              <el-table-column prop="id" label="记录ID" width="100" />
              <el-table-column prop="winnerName" label="中奖者" width="120" />
              <el-table-column prop="prizeName" label="奖品" width="200" />
              <el-table-column prop="prizeLevel" label="奖项" width="100" />
              <el-table-column prop="drawTime" label="抽奖时间" width="180" />
              <el-table-column prop="operator" label="操作员" width="100" />
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button size="small" type="danger" @click="deleteRecord(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 系统设置 -->
        <div v-if="activeMenu === 'settings'" class="settings">
          <h2 class="section-title">系统设置</h2>
          
          <div class="settings-form">
            <el-form :model="settings" label-width="120px">
              <el-form-item label="系统名称">
                <el-input v-model="settings.systemName" placeholder="请输入系统名称" />
              </el-form-item>
              
              <el-form-item label="组织名称">
                <el-input v-model="settings.organizationName" placeholder="请输入组织名称" />
              </el-form-item>
              
              <el-form-item label="抽奖动画时长">
                <el-input-number v-model="settings.animationDuration" :min="1000" :max="10000" :step="500" />
                <span class="form-help">毫秒</span>
              </el-form-item>
              
              <el-form-item label="自动保存">
                <el-switch v-model="settings.autoSave" />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="saveSettings">保存设置</el-button>
                <el-button @click="resetSettings">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </main>
    </div>

    <!-- 导入参与者对话框 -->
    <el-dialog v-model="showImportDialog" title="导入参与者名单" width="500px">
      <div class="import-section">
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls,.csv"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 Excel (.xlsx, .xls) 和 CSV 文件
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="importParticipants">确认导入</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加奖项对话框 -->
    <el-dialog v-model="showPrizeDialog" title="添加奖项" width="500px">
      <el-form :model="newPrize" label-width="100px">
        <el-form-item label="奖项名称" required>
          <el-input v-model="newPrize.level" placeholder="请输入奖项名称" />
        </el-form-item>
        <el-form-item label="奖项描述" required>
          <el-input 
            v-model="newPrize.name" 
            type="textarea" 
            :rows="3"
            placeholder="请输入奖项描述" 
          />
        </el-form-item>
        <el-form-item label="奖项数量" required>
          <el-input-number 
            v-model="newPrize.quantity" 
            :min="1" 
            controls-position="right"
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="奖项等级" required>
          <el-select v-model="newPrize.prizeLevel" placeholder="特等奖" style="width: 100%">
            <el-option label="特等奖" value="特等奖" />
            <el-option label="一等奖" value="一等奖" />
            <el-option label="二等奖" value="二等奖" />
            <el-option label="三等奖" value="三等奖" />
            <el-option label="四等奖" value="四等奖" />
            <el-option label="五等奖" value="五等奖" />
            <el-option label="纪念奖" value="纪念奖" />
          </el-select>
        </el-form-item>
        <el-form-item label="一次抽取人数" required>
          <el-input-number 
            v-model="newPrize.drawCount" 
            :min="1" 
            :max="newPrize.quantity" 
            controls-position="right"
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="奖品图片">
          <el-input v-model="newPrize.image" placeholder="请输入图片URL（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer" style="text-align: right;">
          <el-button @click="showPrizeDialog = false">取消</el-button>
          <el-button type="primary" @click="addPrize">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Setting,
  User,
  DataAnalysis,
  Trophy,
  MagicStick,
  Upload,
  Download,
  Delete,
  Plus,
  Star,
  TrendCharts,
  Histogram,
  Monitor,
  UploadFilled,
  ArrowDown
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 响应式数据
const activeMenu = ref('dashboard')
const showImportDialog = ref(false)
const showPrizeDialog = ref(false)

// 统计数据
const statistics = ref({
  totalParticipants: 156,
  totalPrizes: 25,
  totalWinners: 23,
})

// 计算中奖率
const winningRate = computed(() => {
  if (statistics.value.totalParticipants === 0) return 0
  return ((statistics.value.totalWinners / statistics.value.totalParticipants) * 100).toFixed(1)
})

// 参与者数据
const participants = ref([
  {
    id: 1,
    name: '张三',
    department: '技术部',
    phone: '13800138001',
    email: 'zhangsan@example.com',
    status: '未中奖'
  },
  {
    id: 2,
    name: '李四',
    department: '市场部',
    phone: '13800138002',
    email: 'lisi@example.com',
    status: '已中奖'
  },
  {
    id: 3,
    name: '王五',
    department: '人事部',
    phone: '13800138003',
    email: 'wangwu@example.com',
    status: '未中奖'
  }
])

// 奖品数据
const prizes = ref([
  {
    id: 1,
    level: '一等奖',
    name: '华为mate70pro+',
    quantity: 8,
    drawn: 3,
    drawCount: 4,
    prizeLevel: '一等奖',
    image: '/src/assets/prize/一等奖.png'
  },
  {
    id: 2,
    level: '二等奖',
    name: '华为puraX',
    quantity: 120,
    drawn: 10,
    drawCount: 10,
    prizeLevel: '二等奖',
    image: 'https://ai-public.mastergo.com/ai/img_res/52b3e08599c214acc6802d5f6fbb8503.jpg'
  },
  {
    id: 3,
    level: '三等奖',
    name: '洗衣液一袋',
    quantity: 200,
    drawn: 0,
    drawCount: 25,
    prizeLevel: '三等奖',
    image: 'https://ai-public.mastergo.com/ai/img_res/37bc491a791bc693235bc252a0725d3f.jpg'
  }
])

// 抽奖记录
const lotteryRecords = ref([
  {
    id: 1,
    winnerName: '张三',
    prizeName: '小天鹅洗烘套装',
    prizeLevel: '一等奖',
    drawTime: '2024-12-19 14:30:25',
    operator: '管理员'
  },
  {
    id: 2,
    winnerName: '李四',
    prizeName: '戴森吸尘器',
    prizeLevel: '二等奖',
    drawTime: '2024-12-19 14:32:15',
    operator: '管理员'
  }
])

// 系统设置
const settings = ref({
  systemName: '抽奖系统',
  organizationName: '山西省计算机软件学会',
  animationDuration: 3000,
  autoSave: true
})

// 新奖品表单
const newPrize = ref({
  level: '',
  name: '',
  quantity: 1,
  drawCount: 1,
  prizeLevel: '',
  image: ''
})

// 方法
const handleMenuSelect = (index) => {
  activeMenu.value = index
}

const logout = () => {
  ElMessageBox.confirm('确认退出登录？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('已退出登录')
    // 这里可以添加实际的退出逻辑
  })
}

const handleFileChange = (file) => {
  console.log('选择的文件:', file)
}

const importParticipants = () => {
  ElMessage.success('参与者名单导入成功！')
  showImportDialog.value = false
  // 这里添加实际的导入逻辑
}

const exportParticipants = () => {
  ElMessage.success('参与者名单导出成功！')
  // 这里添加实际的导出逻辑
}

const exportWinners = () => {
  ElMessage.success('中奖名单导出成功！')
  // 这里添加实际的导出逻辑
}

const clearParticipants = () => {
  ElMessageBox.confirm('确认清空所有参与者名单？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    participants.value = []
    ElMessage.success('参与者名单已清空')
  })
}

const clearRecords = () => {
  ElMessageBox.confirm('确认清空所有抽奖记录？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    lotteryRecords.value = []
    ElMessage.success('抽奖记录已清空')
  })
}

const editParticipant = (participant) => {
  ElMessage.info(`编辑参与者: ${participant.name}`)
  // 这里添加编辑逻辑
}

const deleteParticipant = (id) => {
  ElMessageBox.confirm('确认删除该参与者？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    participants.value = participants.value.filter(p => p.id !== id)
    ElMessage.success('删除成功')
  })
}

const getPrizeTagType = (level) => {
  switch (level) {
    case '特等奖':
      return 'danger'
    case '一等奖':
      return 'danger'
    case '二等奖':
      return 'success'
    case '三等奖':
      return 'warning'
    case '四等奖':
      return 'info'
    case '五等奖':
      return 'info'
    case '纪念奖':
      return ''
    default:
      return 'info'
  }
}

const addPrize = () => {
  if (!newPrize.value.level || !newPrize.value.name || !newPrize.value.prizeLevel) {
    ElMessage.error('请填写完整的奖项信息')
    return
  }
  
  const prize = {
    id: Date.now(),
    level: newPrize.value.level,
    name: newPrize.value.name,
    quantity: newPrize.value.quantity,
    drawCount: newPrize.value.drawCount,
    prizeLevel: newPrize.value.prizeLevel,
    image: newPrize.value.image,
    drawn: 0
  }
  
  prizes.value.push(prize)
  ElMessage.success('奖项添加成功')
  showPrizeDialog.value = false
  
  // 重置表单
  newPrize.value = {
    level: '',
    name: '',
    quantity: 1,
    drawCount: 1,
    prizeLevel: '',
    image: ''
  }
}

const editPrize = (prize) => {
  ElMessage.info(`编辑奖品: ${prize.name}`)
  // 这里添加编辑逻辑
}

const deletePrize = (id) => {
  ElMessageBox.confirm('确认删除该奖品？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    prizes.value = prizes.value.filter(p => p.id !== id)
    ElMessage.success('删除成功')
  })
}

const deleteRecord = (id) => {
  ElMessageBox.confirm('确认删除该记录？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    lotteryRecords.value = lotteryRecords.value.filter(r => r.id !== id)
    ElMessage.success('删除成功')
  })
}

const saveSettings = () => {
  ElMessage.success('设置保存成功')
  // 这里添加保存设置的逻辑
}

const resetSettings = () => {
  settings.value = {
    systemName: '抽奖系统',
    organizationName: '山西省计算机软件学会',
    animationDuration: 3000,
    autoSave: true
  }
  ElMessage.success('设置已重置')
}

// 生命周期
onMounted(() => {
  // 初始化数据
  console.log('管理员页面已加载')
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f0f2f5;
}

/* 顶部导航栏 */
.admin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
}

.logo-section {
  display: flex;
  align-items: center;
}

.admin-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 24px;
}

.user-section {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 主要内容区域 */
.admin-main {
  display: flex;
  min-height: calc(100vh - 64px);
}

/* 侧边栏 */
.admin-sidebar {
  width: 240px;
  background-color: #304156;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-menu {
  border: none;
  height: 100%;
}

.sidebar-menu .el-menu-item {
  height: 56px;
  line-height: 56px;
  padding-left: 24px;
}

/* 内容区域 */
.admin-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 24px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

/* 仪表盘样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.participants {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.stat-icon.prizes {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.stat-icon.winners {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.stat-icon.rate {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.stat-content h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.stat-number {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #303133;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* 表格容器 */
.table-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 奖品网格 */
.prizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.prize-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.prize-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.prize-image {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.prize-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prize-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.prize-info p {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.prize-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.prize-stats span {
  font-size: 12px;
  color: #909399;
  background-color: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.prize-actions {
  display: flex;
  gap: 8px;
}

/* 设置表单 */
.settings-form {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-width: 600px;
}

.form-help {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

/* 导入区域 */
.import-section {
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-main {
    flex-direction: column;
  }
  
  .admin-sidebar {
    width: 100%;
    height: auto;
  }
  
  .sidebar-menu {
    display: flex;
    overflow-x: auto;
  }
  
  .sidebar-menu .el-menu-item {
    white-space: nowrap;
    min-width: 120px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .prizes-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>
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
          <el-menu-item index="awards">
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
              <div class="stat-icon awards">
                <el-icon><Trophy /></el-icon>
              </div>
              <div class="stat-content">
                <h3>奖项总数</h3>
                <p class="stat-number">{{ statistics.totalAwards }}</p>
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
              <h3>奖项分布统计</h3>
              <div class="chart-placeholder">
                <el-icon class="chart-icon"><Histogram /></el-icon>
                <p>饼图：各等级奖项数量分布</p>
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
            <el-table 
              :data="paginatedParticipants" 
              style="width: 100%" 
              stripe
              v-loading="loading"
              element-loading-text="加载中..."
            >
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="department" label="部门" width="150">
                <template #default="scope">
                  {{ scope.row.department || '未设置' }}
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="联系电话" width="130">
                <template #default="scope">
                  {{ scope.row.phone || '未设置' }}
                </template>
              </el-table-column>
              <el-table-column prop="email" label="邮箱" width="200">
                <template #default="scope">
                  {{ scope.row.email || '未设置' }}
                </template>
              </el-table-column>
              <el-table-column label="中奖次数" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.win_count || 0 }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.status === '已中奖' ? 'success' : 'info'">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" width="180">
                <template #default="scope">
                  {{ new Date(scope.row.createdAt).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <div class="action-buttons-inline">
                    <el-button size="small" type="primary" @click="editParticipant(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deleteParticipant(scope.row.id)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 分页组件 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="participants.length"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
        </div>

        <!-- 奖项管理 -->
        <div v-if="activeMenu === 'awards'" class="awards">
          <div class="section-header">
            <h2 class="section-title">奖项管理</h2>
            <el-button type="primary" @click="showAwardDialog = true">
              <el-icon><Plus /></el-icon>
              添加奖项
            </el-button>
          </div>
          
          <div class="table-container">
            <el-table 
              :data="awards" 
              style="width: 100%" 
              stripe
              v-loading="awardsLoading"
              element-loading-text="加载奖项数据中..."
            >
              <el-table-column prop="id" label="ID" width="80" align="center" />
              <el-table-column prop="name" label="奖项名称" min-width="200" show-overflow-tooltip />
              <el-table-column prop="description" label="奖项描述" min-width="150" show-overflow-tooltip>
                <template #default="scope">
                  {{ scope.row.description || '未设置' }}
                </template>
              </el-table-column>
              <el-table-column prop="count" label="总数量" width="100" align="center" />
              <el-table-column prop="remaining_count" label="剩余数量" width="100" align="center" />
              <el-table-column prop="level" label="奖项等级" width="120" align="center">
                <template #default="scope">
                  <el-tag :type="getAwardTagType(scope.row.level)" size="large">
                    {{ scope.row.level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="draw_count" label="单次抽取" width="100" align="center" />
              <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
                <template #default="scope">
                  {{ scope.row.createdAt ? new Date(scope.row.createdAt).toLocaleString() : '未知' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="scope">
                  <div class="action-buttons-inline">
                    <el-button size="small" type="primary" link @click="editAward(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" link @click="deleteAward(scope.row.id)">删除</el-button>
                  </div>
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
              <el-table-column prop="awardName" label="奖项" width="200" />
              <el-table-column prop="awardLevel" label="奖项" width="100" />
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
    <el-dialog v-model="showAwardDialog" :title="isEditingAward ? '编辑奖项' : '添加奖项'" width="500px">
      <el-form :model="newAward" label-width="100px">
        <el-form-item label="奖项名称" required>
          <el-input v-model="newAward.name" placeholder="请输入奖项名称" />
        </el-form-item>
        <el-form-item label="奖项描述">
          <el-input 
            v-model="newAward.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入奖项描述" 
          />
        </el-form-item>
        <el-form-item label="奖项数量" required>
          <el-input-number 
            v-model="newAward.count" 
            :min="1" 
            controls-position="right"
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="奖项等级" required>
          <el-select v-model="newAward.level" placeholder="请选择奖项等级" style="width: 100%">
            <el-option label="1" :value="1" />
            <el-option label="2" :value="2" />
            <el-option label="3" :value="3" />
            <el-option label="4" :value="4" />
            <el-option label="5" :value="5" />
            <el-option label="6" :value="6" />
            <el-option label="7" :value="7" />
          </el-select>
        </el-form-item>
        <el-form-item label="一次抽取人数" required>
          <el-input-number 
            v-model="newAward.draw_count" 
            :min="1" 
            :max="newAward.count" 
            controls-position="right"
            style="width: 100%" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer" style="text-align: right;">
          <el-button @click="cancelAwardEdit">取消</el-button>
          <el-button type="primary" @click="saveAward">{{ isEditingAward ? '保存' : '确定' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑参与者对话框 -->
    <el-dialog v-model="showEditParticipantDialog" title="编辑参与者" width="500px">
      <el-form :model="editingParticipant" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="editingParticipant.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="editingParticipant.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="editingParticipant.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editingParticipant.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer" style="text-align: right;">
          <el-button @click="showEditParticipantDialog = false">取消</el-button>
          <el-button type="primary" @click="saveParticipant">保存</el-button>
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
import { participantAPI, awardAPI, lotteryAPI } from '../api/index.js'

// 响应式数据
const activeMenu = ref('dashboard')
const showImportDialog = ref(false)
const showAwardDialog = ref(false)
const showEditParticipantDialog = ref(false)
const isEditingAward = ref(false)
const editingAwardId = ref(null)

// 统计数据
const statistics = ref({
  totalParticipants: 156,
  totalAwards: 25,
  totalWinners: 23,
})

// 计算中奖率
const winningRate = computed(() => {
  if (statistics.value.totalParticipants === 0) return 0
  return ((statistics.value.totalWinners / statistics.value.totalParticipants) * 100).toFixed(1)
})

// 参与者数据
const participants = ref([])
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 分页后的参与者数据
const paginatedParticipants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return participants.value.slice(start, end)
})



// 获取参与者列表
const fetchParticipants = async () => {
  try {
    loading.value = true
    const data = await participantAPI.getAll()
    // 为每个参与者添加状态信息
    participants.value = data.map(participant => ({
      ...participant,
      status: participant.has_won ? '已中奖' : '未中奖'
    }))
  } catch (error) {
    console.error('获取参与者列表失败:', error)
    ElMessage.error('获取参与者列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStatistics = async () => {
  try {
    const [participantsData, winnersData, awardsData] = await Promise.all([
      participantAPI.getAll(),
      lotteryAPI.getWinners(),
      awardAPI.getAll()
    ])
    
    statistics.value = {
      totalParticipants: participantsData.length,
      totalAwards: awardsData.reduce((sum, award) => sum + award.count, 0),
      totalWinners: winnersData.length
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 奖项数据
const awards = ref([])
const awardsLoading = ref(false)

// 获取奖项列表
const fetchAwards = async () => {
  try {
    awardsLoading.value = true
    const data = await awardAPI.getAll()
    awards.value = data
  } catch (error) {
    console.error('获取奖项列表失败:', error)
    ElMessage.error('获取奖项列表失败')
  } finally {
    awardsLoading.value = false
  }
}

// 抽奖记录
const lotteryRecords = ref([
  {
    id: 1,
    winnerName: '张三',
    awardName: '小天鹅洗烘套装',
    awardLevel: '一等奖',
    drawTime: '2024-12-19 14:30:25',
    operator: '管理员'
  },
  {
    id: 2,
    winnerName: '李四',
    awardName: '戴森吸尘器',
    awardLevel: '二等奖',
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

// 新奖项表单
const newAward = ref({
  name: '',
  description: '',
  count: 1,
  level: 1,
  draw_count: 1
})

// 编辑参与者表单
const editingParticipant = ref({
  id: null,
  name: '',
  department: '',
  phone: '',
  email: ''
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

// clearParticipants 方法已在上面重新实现

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

// 编辑参与者
const editParticipant = (participant) => {
  editingParticipant.value = {
    id: participant.id,
    name: participant.name,
    department: participant.department || '',
    phone: participant.phone || '',
    email: participant.email || ''
  }
  showEditParticipantDialog.value = true
}

// 保存参与者
const saveParticipant = async () => {
  if (!editingParticipant.value.name.trim()) {
    ElMessage.error('请输入参与者姓名')
    return
  }
  
  try {
    const participantData = {
      name: editingParticipant.value.name.trim(),
      department: editingParticipant.value.department.trim(),
      phone: editingParticipant.value.phone.trim(),
      email: editingParticipant.value.email.trim()
    }
    
    await participantAPI.update(editingParticipant.value.id, participantData)
    ElMessage.success('参与者信息更新成功')
    showEditParticipantDialog.value = false
    
    // 重新获取参与者列表
    await fetchParticipants()
  } catch (error) {
    console.error('更新参与者失败:', error)
    ElMessage.error('更新参与者失败')
  }
}

// 删除参与者
const deleteParticipant = async (id) => {
  try {
    await ElMessageBox.confirm('确认删除该参与者？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await participantAPI.delete(id)
    ElMessage.success('删除成功')
    // 重新获取参与者列表
    await fetchParticipants()
    await fetchStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除参与者失败:', error)
    }
  }
}

// 分页事件处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 清空参与者名单
const clearParticipants = async () => {
  try {
    await ElMessageBox.confirm('确认清空所有参与者名单？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 批量删除所有参与者
    const deletePromises = participants.value.map(p => participantAPI.delete(p.id))
    await Promise.all(deletePromises)
    
    ElMessage.success('参与者名单已清空')
    await fetchParticipants()
    await fetchStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空参与者名单失败:', error)
    }
  }
}

const getAwardTagType = (level) => {
  const levelNum = parseInt(level)
  switch (levelNum) {
    case 1:
      return 'danger'
    case 2:
      return 'success'
    case 3:
      return 'warning'
    case 4:
    case 5:
    case 6:
    case 7:
      return 'info'
    default:
      return 'info'
  }
}

const addAward = async () => {
  if (!newAward.value.name || !newAward.value.level || !newAward.value.count || !newAward.value.draw_count) {
    ElMessage.error('请填写完整的奖项信息')
    return
  }
  
  if (newAward.value.draw_count > newAward.value.count) {
    ElMessage.error('单次抽取人数不能大于奖项总数量')
    return
  }
  
  try {
    const awardData = {
      name: newAward.value.name,
      description: newAward.value.description || '',
      level: newAward.value.level,
      count: newAward.value.count,
      draw_count: newAward.value.draw_count
    }
    
    const result = await awardAPI.create(awardData)
    console.log('添加奖项成功:', result)
    ElMessage.success('奖项添加成功')
    showAwardDialog.value = false
    
    // 重置表单
    resetAwardForm()
    
    // 刷新奖项列表和统计数据
    await fetchAwards()
    await fetchStatistics()
  } catch (error) {
    console.error('添加奖项失败:', error)
    // 移除重复的错误提示，因为响应拦截器已经处理了
    // ElMessage.error('添加奖项失败')
  }
}

// 保存奖项（新增或编辑）
const saveAward = async () => {
  if (isEditingAward.value) {
    await updateAward()
  } else {
    await addAward()
  }
}

// 更新奖项
const updateAward = async () => {
  if (!newAward.value.name || !newAward.value.level || !newAward.value.count || !newAward.value.draw_count) {
    ElMessage.error('请填写完整的奖项信息')
    return
  }
  
  if (newAward.value.draw_count > newAward.value.count) {
    ElMessage.error('单次抽取人数不能大于奖项总数量')
    return
  }
  
  try {
    const awardData = {
      name: newAward.value.name,
      description: newAward.value.description || '',
      level: newAward.value.level,
      count: newAward.value.count,
      draw_count: newAward.value.draw_count
    }
    
    const result = await awardAPI.update(editingAwardId.value, awardData)
    console.log('更新奖项成功:', result)
    ElMessage.success('奖项更新成功')
    showAwardDialog.value = false
    
    // 重置表单
    resetAwardForm()
    
    // 刷新奖项列表和统计数据
    await fetchAwards()
    await fetchStatistics()
  } catch (error) {
    console.error('更新奖项失败:', error)
    // 移除重复的错误提示，因为响应拦截器已经处理了
    // ElMessage.error('更新奖项失败')
  }
}

// 取消奖项编辑
const cancelAwardEdit = () => {
  showAwardDialog.value = false
  resetAwardForm()
}

// 重置奖项表单
const resetAwardForm = () => {
  newAward.value = {
    name: '',
    description: '',
    count: 1,
    level: 1,
    draw_count: 1
  }
  isEditingAward.value = false
  editingAwardId.value = null
}

const editAward = (award) => {
  isEditingAward.value = true
  editingAwardId.value = award.id
  newAward.value = {
    name: award.name,
    description: award.description || '',
    count: award.count,
    level: award.level,
    draw_count: award.draw_count || 1
  }
  showAwardDialog.value = true
}

const deleteAward = (id) => {
  ElMessageBox.confirm('确认删除该奖项？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await awardAPI.delete(id)
      console.log('删除奖项成功:', result)
      ElMessage.success('删除成功')
      // 刷新奖项列表和统计数据
      await fetchAwards()
      await fetchStatistics()
    } catch (error) {
      console.error('删除奖项失败:', error)
      // 移除重复的错误提示，因为响应拦截器已经处理了
      // ElMessage.error('删除奖项失败')
    }
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
onMounted(async () => {
  // 初始化数据
  console.log('管理员页面已加载')
  await fetchParticipants()
  await fetchAwards()
  await fetchStatistics()
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



/* 侧边栏 */
.admin-sidebar {
  width: 250px;
  background-color: #304156;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
}

.sidebar-menu {
  border: none;
  height: 100%;
}

/* 内容区域 */
.admin-content {
  flex: 1;
  padding: 24px;
  background-color: #f0f2f5;
  overflow-y: auto;
}

/* 页面标题 */
.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 24px 0;
}

/* 页面头部 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons-inline {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* 表格容器 */
.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 分页容器 */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-top: 1px solid #ebeef5;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.participants {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.awards {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.winners {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.rate {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.stat-number {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* 导入区域 */
.import-section {
  padding: 20px 0;
}

/* 设置表单 */
.settings-form {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
}

.form-help {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
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
  
  .admin-content {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
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

.stat-icon.awards {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

/* 操作按钮样式 */
.action-buttons-inline {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-buttons-inline .el-button {
  margin: 0;
}

/* 分页容器样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
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

/* 奖项网格 */
.awards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.award-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.award-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.award-image {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.award-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.award-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.award-info p {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.award-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.award-stats span {
  font-size: 12px;
  color: #909399;
  background-color: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.award-actions {
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
  
  .awards-grid {
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
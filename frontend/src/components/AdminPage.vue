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
                <p class="stat-number">{{ statisticsData?.basicStats?.totalParticipants || statistics.totalParticipants }}</p>
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
                <p class="stat-number">{{ statisticsData?.basicStats?.totalWinners || statistics.totalWinners }}</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon rate">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-content">
                <h3>中奖率</h3>
                <p class="stat-number">{{ statisticsData?.basicStats?.winProbability ? (statisticsData.basicStats.winProbability * 100).toFixed(1) : winningRate }}%</p>
              </div>
            </div>
          </div>

          <!-- 统计分析区域 -->
          <div class="statistics-section" v-if="statisticsData">
            <div class="section-header">
              <h3 class="section-title">统计分析</h3>
              <el-button type="primary" @click="refreshStatistics" :loading="statisticsLoading">
                <el-icon><RefreshLeft /></el-icon>
                刷新数据
              </el-button>
            </div>
            
            <!-- 正态分布检验 -->
            <div class="analysis-grid">
              <div class="analysis-card">
                <h4>正态分布检验</h4>
                <div class="normality-test">
                  <div class="test-result">
                    <div ref="normalityChart" style="width: 100%; height: 250px;"></div>
                    <div class="result-status" :class="{ 'normal': statisticsData.normalityTest?.isNormalDistribution, 'abnormal': !statisticsData.normalityTest?.isNormalDistribution }">
                      <el-icon v-if="statisticsData.normalityTest?.isNormalDistribution"><Star /></el-icon>
                      <el-icon v-else><Warning /></el-icon>
                      <span>{{ statisticsData.normalityTest?.interpretation?.conclusion || '数据加载中...' }}</span>
                    </div>
                  </div>
                  
                  <div class="test-details">
                    <div class="detail-item">
                      <span class="label">均值:</span>
                      <span class="value">{{ statisticsData.normalityTest?.mean?.toFixed(3) || 'N/A' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">标准差:</span>
                      <span class="value">{{ statisticsData.normalityTest?.standardDeviation?.toFixed(3) || 'N/A' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">偏度:</span>
                      <span class="value">{{ statisticsData.normalityTest?.skewness?.toFixed(3) || 'N/A' }} ({{ statisticsData.normalityTest?.interpretation?.skewnessLevel || 'N/A' }})</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">峰度:</span>
                      <span class="value">{{ statisticsData.normalityTest?.kurtosis?.toFixed(3) || 'N/A' }} ({{ statisticsData.normalityTest?.interpretation?.kurtosisLevel || 'N/A' }})</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 公平性分析 -->
              <div class="analysis-card">
                <h4>公平性分析</h4>
                <div class="fairness-analysis">
                  <div class="fairness-score" :class="statisticsData.fairnessAnalysis?.fairnessScore === '良好' ? 'good' : 'warning'">
                    <el-icon v-if="statisticsData.fairnessAnalysis?.fairnessScore === '良好'"><Star /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    <span>公平性评分: {{ statisticsData.fairnessAnalysis?.fairnessScore || '数据加载中...' }}</span>
                  </div>
                  
                  <div class="fairness-details">
                    <div class="detail-item">
                      <span class="label">期望中奖次数/人:</span>
                      <span class="value">{{ statisticsData.fairnessAnalysis?.expectedWinsPerPerson?.toFixed(3) || 'N/A' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">实际中奖比例:</span>
                      <span class="value">{{ statisticsData.fairnessAnalysis?.actualWinnerRatio ? (statisticsData.fairnessAnalysis.actualWinnerRatio * 100).toFixed(1) : 'N/A' }}%</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">中奖集中度:</span>
                      <span class="value">{{ statisticsData.fairnessAnalysis?.concentrationIndex?.toFixed(2) || 'N/A' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分布图表区域 -->
          <div class="charts-section">
            <div class="chart-card" v-if="statisticsData?.distributions?.winCount">
              <h3>中奖次数分布</h3>
              <div class="distribution-chart">
                <div class="chart-bars">
                  <div 
                    v-for="item in (statisticsData?.distributions?.winCount || [])" 
                    :key="item.win_count"
                    class="bar-item"
                  >
                    <div 
                      class="bar" 
                      :style="{ height: statisticsData?.distributions?.winCount ? (item.participant_count / Math.max(...statisticsData.distributions.winCount.map(i => i.participant_count)) * 100) + '%' : '0%' }"
                    ></div>
                    <div class="bar-label">{{ item.win_count }}次</div>
                    <div class="bar-value">{{ item.participant_count }}人</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="chart-card" v-if="statisticsData?.distributions?.department">
              <h3>部门中奖分布</h3>
              <div class="department-chart">
                <div 
                  v-for="dept in (statisticsData?.distributions?.department || []).slice(0, 8)" 
                  :key="dept.department"
                  class="dept-item"
                >
                  <div class="dept-name">{{ dept.department }}</div>
                  <div class="dept-stats">
                    <span class="total">总人数: {{ dept.total_participants }}</span>
                    <span class="winners">中奖: {{ dept.unique_winners }}</span>
                    <span class="rate">中奖率: {{ dept.total_participants > 0 ? (dept.unique_winners / dept.total_participants * 100).toFixed(1) : 0 }}%</span>
                  </div>
                </div>
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
            <el-table 
              :data="paginatedLotteryRecords" 
              style="width: 100%" 
              stripe 
              v-loading="lotteryLoading"
              element-loading-text="加载抽奖记录中..."
              @sort-change="handleLotterySortChange"
              :default-sort="{ prop: 'drawTime', order: 'descending' }"
            >
              <el-table-column prop="id" label="记录ID" width="80" sortable />
              <el-table-column prop="winnerName" label="中奖者" width="120" sortable />
              <el-table-column prop="department" label="部门" width="120" sortable />
              <el-table-column prop="awardName" label="奖项" width="120" sortable />
              <el-table-column prop="epoch" label="轮次" width="80" sortable />
              <el-table-column prop="awardLevel" label="等级" width="80" sortable>
                <template #default="scope">
                  <el-tag :type="getAwardLevelType(scope.row.awardLevel)" size="small">
                    {{ scope.row.awardLevel }}等奖
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="drawTime" label="抽奖时间" width="180" sortable />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="danger" link @click="deleteRecord(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 分页组件 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="lotteryCurrentPage"
                v-model:page-size="lotteryPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="lotteryRecords.length"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleLotterySizeChange"
                @current-change="handleLotteryCurrentChange"
              />
            </div>
          </div>
        </div>

        <!-- 系统设置 -->
        <div v-if="activeMenu === 'settings'" class="settings">
          <h2 class="section-title">系统设置</h2>
          
          <!-- 基础设置 -->
          <div class="settings-section">
            <h3 class="settings-section-title">基础设置</h3>
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
                
                <el-form-item label="中奖者显示延迟">
                  <el-select v-model="settings.winnerDisplayDelay" placeholder="请选择显示延迟时间">
                    <el-option label="立即显示" :value="0" />
                    <el-option label="延迟1秒显示" :value="1000" />
                    <el-option label="延迟2秒显示" :value="2000" />
                    <el-option label="延迟3秒显示" :value="3000" />
                    <el-option label="延迟5秒显示" :value="5000" />
                  </el-select>
                  <span class="form-help">停止抽奖后显示中奖者的延迟时间</span>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="saveSettings">保存设置</el-button>
                  <el-button @click="resetSettings">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <!-- 多次中奖控制设置 -->
          <div class="settings-section">
            <h3 class="settings-section-title">
              <el-icon><MagicStick /></el-icon>
              多次中奖控制
            </h3>
            <div class="settings-form">
              <el-form :model="multiWinConfig" label-width="150px">
                <el-form-item label="启用控制">
                  <el-switch v-model="multiWinConfig.enabled" />
                  <span class="form-help">启用后将按照下方配置控制多次中奖比例和间隔</span>
                </el-form-item>
                
                <el-form-item label="三次中奖者比例" v-if="multiWinConfig.enabled">
                  <el-input-number 
                    v-model="multiWinConfig.threeWinPercentage" 
                    :min="0" 
                    :max="100" 
                    :step="1" 
                    controls-position="right"
                  />
                  <span class="form-help">%（建议5%）</span>
                </el-form-item>
                
                <el-form-item label="二次中奖者比例" v-if="multiWinConfig.enabled">
                  <el-input-number 
                    v-model="multiWinConfig.twoWinPercentage" 
                    :min="0" 
                    :max="100" 
                    :step="1" 
                    controls-position="right"
                  />
                  <span class="form-help">%（建议10%）</span>
                </el-form-item>
                
                <el-form-item label="最小轮次间隔" v-if="multiWinConfig.enabled">
                  <el-input-number 
                    v-model="multiWinConfig.minEpochInterval" 
                    :min="1" 
                    :max="10" 
                    :step="1" 
                    controls-position="right"
                  />
                  <span class="form-help">轮（多次中奖者再次中奖的最小间隔轮次）</span>
                </el-form-item>
                
                <el-form-item v-if="multiWinConfig.enabled">
                  <el-button type="primary" @click="saveMultiWinConfig" :loading="multiWinConfigLoading">
                    保存多次中奖控制配置
                  </el-button>
                  <el-button @click="loadMultiWinConfig">
                    重置
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 多次中奖统计信息 -->
            <div class="multi-win-stats" v-if="multiWinConfig.enabled">
              <h4>当前多次中奖统计</h4>
              <div class="stats-row" v-if="multiWinStats">
                <div class="stat-item">
                  <span class="label">三次中奖者：</span>
                  <span class="value">{{ multiWinStats.threeWinCount || 0 }}人 ({{ ((multiWinStats.threeWinCount || 0) / (multiWinStats.totalParticipants || 1) * 100).toFixed(1) }}%)</span>
                </div>
                <div class="stat-item">
                  <span class="label">二次中奖者：</span>
                  <span class="value">{{ multiWinStats.twoWinCount || 0 }}人 ({{ ((multiWinStats.twoWinCount || 0) / (multiWinStats.totalParticipants || 1) * 100).toFixed(1) }}%)</span>
                </div>
                <div class="stat-item">
                  <span class="label">一次中奖者：</span>
                  <span class="value">{{ multiWinStats.oneWinCount || 0 }}人 ({{ ((multiWinStats.oneWinCount || 0) / (multiWinStats.totalParticipants || 1) * 100).toFixed(1) }}%)</span>
                </div>
              </div>
              <el-button type="info" size="small" @click="loadMultiWinStats" :loading="multiWinStatsLoading">
                刷新统计
              </el-button>
            </div>
          </div>

          <!-- 数据管理 -->
          <div class="settings-section danger-section">
            <h3 class="settings-section-title danger-title">
              <el-icon><Warning /></el-icon>
              危险操作
            </h3>
            <div class="danger-content">
              <div class="danger-item">
                <div class="danger-info">
                  <h4>重置抽奖数据</h4>
                  <p>此操作将清空所有中奖记录、重置参与者中奖状态、重置奖项剩余数量，且不可恢复！</p>
                  <ul class="reset-details">
                    <li>清空所有中奖记录</li>
                    <li>重置所有参与者的中奖状态和中奖次数</li>
                    <li>恢复所有奖项的剩余数量</li>
                    <li>重置轮次信息</li>
                  </ul>
                </div>
                <el-button 
                  type="danger" 
                  @click="resetLotteryData"
                  :loading="resetLoading"
                  size="large"
                >
                  <el-icon><RefreshLeft /></el-icon>
                  {{ resetLoading ? '重置中...' : '重置抽奖数据' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 导入参与者对话框 -->
    <el-dialog v-model="showImportDialog" title="导入参与者名单" width="600px">
      <div class="import-section">
        <div class="import-tips">
          <h4>文件格式要求：</h4>
          <ul>
            <li>支持 Excel (.xlsx, .xls) 和 CSV 文件</li>
            <li>必须包含 <strong>"name"</strong> 或 <strong>"姓名"</strong> 列</li>
            <li>可选包含 <strong>"user_id"</strong>、<strong>"工号"</strong>、<strong>"员工号"</strong> 列</li>
            <li>可选包含 <strong>"department"</strong> 或 <strong>"部门"</strong> 列</li>
            <li>文件大小不超过 5MB</li>
          </ul>
        </div>
        
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="[]"
          accept=".xlsx,.xls,.csv"
          :disabled="importLoading"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              {{ selectedFile ? `已选择文件: ${selectedFile.name}` : '请选择要导入的文件' }}
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false" :disabled="importLoading">取消</el-button>
          <el-button 
            type="primary" 
            @click="importParticipants" 
            :loading="importLoading"
            :disabled="!selectedFile"
          >
            {{ importLoading ? '导入中...' : '确认导入' }}
          </el-button>
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

    <!-- 导出选项对话框 -->
    <el-dialog v-model="showExportDialog" :title="exportType === 'participants' ? '导出参与者名单' : '导出中奖记录'" width="400px">
      <el-form label-width="100px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio label="xlsx">
              <el-icon><Document /></el-icon>
              Excel格式 (.xlsx)
            </el-radio>
            <el-radio label="csv">
              <el-icon><Document /></el-icon>
              CSV格式 (.csv)
            </el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="导出说明">
          <div class="export-info">
            <p v-if="exportType === 'participants'">
              <el-icon><InfoFilled /></el-icon>
              将导出所有参与者的详细信息，包括姓名、部门、联系方式、中奖状态等。
            </p>
            <p v-else>
              <el-icon><InfoFilled /></el-icon>
              将导出所有中奖记录，包括中奖者、奖项、抽奖时间等信息。
            </p>
          </div>
        </el-form-item>
        
        <el-form-item label="文件预览">
          <div class="file-preview">
            <el-icon><Folder /></el-icon>
            <span>{{ exportType === 'participants' ? '参与者名单' : '中奖名单' }}_{{ new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') }}.{{ exportFormat }}</span>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer" style="text-align: right;">
          <el-button @click="showExportDialog = false" :disabled="exportLoading">取消</el-button>
          <el-button type="primary" @click="performExport" :loading="exportLoading">
            <el-icon v-if="!exportLoading"><Download /></el-icon>
            {{ exportLoading ? '导出中...' : '开始导出' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
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
  ArrowDown,
  Document,
  InfoFilled,
  Folder,
  Warning,
  RefreshLeft
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { participantAPI, awardAPI, lotteryAPI } from '../api/index.js'
import * as echarts from 'echarts'

// 响应式数据
const activeMenu = ref('dashboard')
const showImportDialog = ref(false)
const showAwardDialog = ref(false)
const showEditParticipantDialog = ref(false)
const showExportDialog = ref(false)
const isEditingAward = ref(false)
const editingAwardId = ref(null)
const exportLoading = ref(false)
const exportType = ref('all') // 'all', 'current-page'
const exportFormat = ref('xlsx') // 'xlsx', 'csv'
const resetLoading = ref(false)

// 统计数据
const statistics = ref({
  totalParticipants: 156,
  totalAwards: 25,
  totalWinners: 23,
})

// 统计分析数据
const statisticsData = ref(null)
const statisticsLoading = ref(false)
const normalityChart = ref(null)
let chartInstance = null

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
    console.log('awardsData', awardsData)
    statistics.value = {
      totalParticipants: participantsData.length,
      totalAwards: awardsData.length,
      totalWinners: winnersData.length
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 获取统计分析数据
const fetchStatisticsData = async () => {
  try {
    statisticsLoading.value = true
    const data = await lotteryAPI.getStatistics()
    statisticsData.value = data
    console.log('统计分析数据:', data)
  } catch (error) {
    console.error('获取统计分析数据失败:', error)
    ElMessage.error('获取统计分析数据失败')
  } finally {
    statisticsLoading.value = false
  }
}

// 初始化正态分布图表
const initNormalityChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  if (!normalityChart.value || !statisticsData.value?.normalityTest) return;

  chartInstance = echarts.init(normalityChart.value);
  const { mean, standardDeviation, dataPoints } = statisticsData.value.normalityTest;

  const generateNormalDistributionData = (mean, stdDev, count) => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const x = mean - 3 * stdDev + (6 * stdDev * i) / (count - 1);
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      data.push([x, y]);
    }
    return data;
  };

  const normalCurve = generateNormalDistributionData(mean, standardDeviation, 100);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['实际分布', '正态分布曲线']
    },
    xAxis: {
      type: 'value',
      name: '中奖次数',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: [
      {
        type: 'value',
        name: '人数',
        position: 'left'
      },
      {
        type: 'value',
        name: '概率密度',
        position: 'right'
      }
    ],
    series: [
      {
        name: '实际分布',
        type: 'bar',
        data: dataPoints,
        itemStyle: {
          color: '#409EFF'
        },
        barWidth: '60%'
      },
      {
        name: '正态分布曲线',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: normalCurve,
        itemStyle: {
          color: '#E6A23C'
        },
        lineStyle: {
          width: 2
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 刷新统计数据
const refreshStatistics = async () => {
  await Promise.all([
    fetchStatistics(),
    fetchStatisticsData()
  ])
  await nextTick();
  initNormalityChart();
  ElMessage.success('统计数据已刷新')
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
const lotteryRecords = ref([])
const lotteryLoading = ref(false)

// 抽奖记录分页相关
const lotteryCurrentPage = ref(1)
const lotteryPageSize = ref(10)
const lotterySortField = ref('drawTime')
const lotterySortOrder = ref('descending')

// 分页和排序后的抽奖记录数据
const paginatedLotteryRecords = computed(() => {
  let sortedRecords = [...lotteryRecords.value]
  
  // 排序
  if (lotterySortField.value) {
    sortedRecords.sort((a, b) => {
      let aValue = a[lotterySortField.value]
      let bValue = b[lotterySortField.value]
      
      // 处理时间字段的排序
      if (lotterySortField.value === 'drawTime') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      // 处理数字字段的排序
      if (lotterySortField.value === 'id' || lotterySortField.value === 'awardLevel' || lotterySortField.value === 'epoch') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }
      
      if (lotterySortOrder.value === 'ascending') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }
  
  // 分页
  const start = (lotteryCurrentPage.value - 1) * lotteryPageSize.value
  const end = start + lotteryPageSize.value
  return sortedRecords.slice(start, end)
})

// 获取抽奖记录
const fetchLotteryRecords = async () => {
  try {
    lotteryLoading.value = true
    const data = await lotteryAPI.getWinners()
    // 转换数据格式以匹配表格显示
    console.log('data', data)
    lotteryRecords.value = data.map(record => ({
      id: record.id,
      winnerName: record.name,
      awardName: record.award_name,
      awardLevel: record.award_level,
      drawTime: new Date(record.draw_time).toLocaleString(),
      department: record.department || '未知',
      award: record.award,
      epoch: record.epoch
    }))
  } catch (error) {
    console.error('获取抽奖记录失败:', error)
    ElMessage.error('获取抽奖记录失败')
  } finally {
    lotteryLoading.value = false
  }
}

// 系统设置
const settings = ref({
  systemName: '抽奖系统',
  organizationName: '山西省计算机软件学会',
  animationDuration: 3000,
  autoSave: true,
  winnerDisplayDelay: 0 // 停止抽奖后显示中奖者的延迟时间（毫秒）
})

// 多次中奖控制配置
const multiWinConfig = ref({
  enabled: true,
  threeWinPercentage: 5,
  twoWinPercentage: 10,
  minEpochInterval: 3
})

const multiWinConfigLoading = ref(false)
const multiWinStats = ref(null)
const multiWinStatsLoading = ref(false)

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

// 导入相关的响应式数据
const selectedFile = ref(null)
const importLoading = ref(false)

const handleFileChange = (file) => {
  console.log('选择的文件:', file)
  selectedFile.value = file.raw || file
}

const importParticipants = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择要导入的文件')
    return
  }
  
  try {
    importLoading.value = true
    const result = await participantAPI.import(selectedFile.value)
    
    // 显示导入结果
     const { total, success, errors, errorDetails } = result
     let message = `导入完成！\n总计: ${total} 条\n成功: ${success} 条`
     
     if (errors > 0) {
       message += `\n失败: ${errors} 条`
       if (errorDetails && errorDetails.length > 0) {
         message += `\n错误详情: ${errorDetails.slice(0, 3).join(', ')}`
         if (errorDetails.length > 3) {
           message += ` 等${errorDetails.length}个错误`
         }
       }
     }
    
    if (success > 0) {
      ElMessage.success(message)
      // 刷新参与者列表和统计数据
      await fetchParticipants()
      await fetchStatistics()
    } else {
      ElMessage.warning(message)
    }
    
    showImportDialog.value = false
    selectedFile.value = null
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请检查文件格式')
  } finally {
    importLoading.value = false
  }
}

const exportParticipants = () => {
  exportType.value = 'participants'
  showExportDialog.value = true
}

// 执行导出操作
const performExport = async () => {
  try {
    exportLoading.value = true
    
    let dataToExport = []
    let filename = ''
    let sheetName = ''
    
    if (exportType.value === 'participants') {
      if (participants.value.length === 0) {
        ElMessage.warning('暂无参与者数据可导出')
        return
      }
      
      dataToExport = participants.value.map((participant, index) => ({
        '序号': index + 1,
        'ID': participant.id,
        '姓名': participant.name,
        '部门': participant.department || '未设置',
        '联系电话': participant.phone || '未设置',
        '邮箱': participant.email || '未设置',
        '中奖次数': participant.win_count || 0,
        '状态': participant.status,
        '创建时间': new Date(participant.createdAt).toLocaleString()
      }))
      filename = '参与者名单'
      sheetName = '参与者名单'
    } else if (exportType.value === 'lottery') {
      if (lotteryRecords.value.length === 0) {
        ElMessage.warning('暂无中奖记录可导出')
        return
      }
      
      dataToExport = lotteryRecords.value.map((record, index) => ({
        '序号': index + 1,
        '记录ID': record.id,
        '中奖者': record.winnerName,
        '部门': record.department || '未知',
        '奖项名称': record.awardName,
        '奖项等级': `${record.awardLevel}等奖`,
        '抽奖轮次': record.epoch,
        '抽奖时间': record.drawTime
      }))
      filename = '中奖名单'
      sheetName = '中奖名单'
    }

    // 动态导入xlsx库
    const XLSX = await import('xlsx')
    
    if (exportFormat.value === 'xlsx') {
      // Excel导出
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dataToExport)

      // 设置列宽
      const colWidths = exportType.value === 'participants' ? [
        { wch: 8 },  // 序号
        { wch: 8 },  // ID
        { wch: 15 }, // 姓名
        { wch: 20 }, // 部门
        { wch: 15 }, // 联系电话
        { wch: 25 }, // 邮箱
        { wch: 10 }, // 中奖次数
        { wch: 10 }, // 状态
        { wch: 20 }  // 创建时间
      ] : [
        { wch: 8 },  // 序号
        { wch: 10 }, // 记录ID
        { wch: 15 }, // 中奖者
        { wch: 20 }, // 部门
        { wch: 20 }, // 奖项名称
        { wch: 12 }, // 奖项等级
        { wch: 10 }, // 抽奖轮次
        { wch: 20 }  // 抽奖时间
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-')
      const fullFilename = `${filename}_${timestamp}.xlsx`
      
      XLSX.writeFile(wb, fullFilename)
      ElMessage.success(`${filename}导出成功！文件名：${fullFilename}`)
    } else if (exportFormat.value === 'csv') {
      // CSV导出
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const csv = XLSX.utils.sheet_to_csv(ws)
      
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-')
      const fullFilename = `${filename}_${timestamp}.csv`
      
      // 创建下载链接
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', fullFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      ElMessage.success(`${filename}导出成功！文件名：${fullFilename}`)
    }
    
    showExportDialog.value = false
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    exportLoading.value = false
  }
}

const exportWinners = () => {
  exportType.value = 'lottery'
  showExportDialog.value = true
}

// clearParticipants 方法已在上面重新实现

const clearRecords = async () => {
  try {
    await ElMessageBox.confirm(
      '确认清空所有抽奖记录？此操作将删除所有中奖记录并重置奖项数量，不可恢复！', 
      '警告', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    await lotteryAPI.reset()
    ElMessage.success('抽奖记录已清空，奖项数量已重置')
    
    // 重新获取数据
    await fetchLotteryRecords()
    await fetchStatistics()
    await fetchAwards()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空抽奖记录失败:', error)
    }
  }
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

// 抽奖记录分页事件处理
const handleLotterySizeChange = (val) => {
  lotteryPageSize.value = val
  lotteryCurrentPage.value = 1
}

const handleLotteryCurrentChange = (val) => {
  lotteryCurrentPage.value = val
}

// 抽奖记录排序事件处理
const handleLotterySortChange = ({ prop, order }) => {
  lotterySortField.value = prop
  lotterySortOrder.value = order
}

// 清空参与者名单
const clearParticipants = async () => {
  try {
    await ElMessageBox.confirm('确认清空所有参与者名单？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    loading.value = true
    
    try {
      // 尝试普通清空
      const result = await participantAPI.clearAll(false)
      ElMessage.success(`清空成功，共删除 ${result.deletedCount} 个参与者`)
      await fetchParticipants()
      await fetchStatistics()
    } catch (error) {
      // 如果存在已中奖参与者，询问是否强制清空
      if (error.response?.data?.hasWinners) {
        const winnersCount = error.response.data.winnersCount
        await ElMessageBox.confirm(
          `检测到 ${winnersCount} 个已中奖的参与者。\n强制清空将同时删除所有中奖记录，此操作不可恢复！\n\n确认要强制清空吗？`,
          '存在已中奖参与者',
          {
            confirmButtonText: '强制清空',
            cancelButtonText: '取消',
            type: 'error',
            dangerouslyUseHTMLString: true
          }
        )
        
        // 强制清空
        const result = await participantAPI.clearAll(true)
        ElMessage.success(
          `强制清空成功！\n删除参与者: ${result.deletedCount} 个\n清除中奖记录: ${result.winnersCleared} 个`
        )
        await fetchParticipants()
        await fetchStatistics()
      } else {
        throw error
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空参与者名单失败:', error)
      ElMessage.error('清空失败: ' + (error.response?.data?.error || error.message))
    }
  } finally {
    loading.value = false
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

const deleteRecord = async (id) => {
  try {
    await ElMessageBox.confirm('确认删除该中奖记录？删除后将恢复对应奖项的数量。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await lotteryAPI.deleteWinner(id)
    ElMessage.success('删除成功')
    
    // 重新获取数据
    await fetchLotteryRecords()
    await fetchStatistics()
    await fetchAwards()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除中奖记录失败:', error)
    }
  }
}

const saveSettings = async () => {
  try {
    // 保存系统配置到后端
    const response = await fetch('/api/lottery/system-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        winnerDisplayDelay: settings.value.winnerDisplayDelay
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      ElMessage.success('设置保存成功');
    } else {
      ElMessage.error(data.error || '保存设置失败');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    ElMessage.error('保存设置失败');
  }
}

const resetSettings = () => {
  settings.value = {
    systemName: '抽奖系统',
    organizationName: '山西省计算机软件学会',
    animationDuration: 3000,
    autoSave: true,
    winnerDisplayDelay: 0
  }
  ElMessage.success('设置已重置')
}

// 多次中奖控制相关方法
const loadMultiWinConfig = async () => {
  try {
    const response = await fetch('/api/lottery/multi-win-config')
    if (response.ok) {
      const result = await response.json()
      const config = result.config || result
      multiWinConfig.value = {
        enabled: config.enabled === 1 || config.enabled === true,
        threeWinPercentage: config.threeWinPercentage,
        twoWinPercentage: config.twoWinPercentage,
        minEpochInterval: config.minEpochInterval
      }
    }
  } catch (error) {
    console.error('加载多次中奖控制配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

const saveMultiWinConfig = async () => {
  try {
    multiWinConfigLoading.value = true
    const response = await fetch('/api/lottery/multi-win-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: multiWinConfig.value.enabled ? 1 : 0,
        threeWinPercentage: multiWinConfig.value.threeWinPercentage,
        twoWinPercentage: multiWinConfig.value.twoWinPercentage,
        minEpochInterval: multiWinConfig.value.minEpochInterval
      })
    })
    
    if (response.ok) {
      ElMessage.success('多次中奖控制配置保存成功')
      // 刷新统计信息
      if (multiWinConfig.value.enabled) {
        loadMultiWinStats()
      }
    } else {
      const error = await response.json()
      ElMessage.error(error.message || '保存配置失败')
    }
  } catch (error) {
    console.error('保存多次中奖控制配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    multiWinConfigLoading.value = false
  }
}

const loadMultiWinStats = async () => {
  try {
    multiWinStatsLoading.value = true
    const response = await fetch('/api/lottery/multi-win-stats')
    if (response.ok) {
      multiWinStats.value = await response.json()
    }
  } catch (error) {
    console.error('加载多次中奖统计失败:', error)
    ElMessage.error('加载统计信息失败')
  } finally {
    multiWinStatsLoading.value = false
  }
}

// 重置抽奖数据
const resetLotteryData = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将清空所有抽奖数据，包括：\n\n• 所有中奖记录\n• 参与者中奖状态\n• 奖项剩余数量\n• 轮次信息\n\n此操作不可恢复，确认要继续吗？',
      '重置抽奖数据',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: true,
        customClass: 'reset-confirm-dialog'
      }
    )
    
    // 二次确认
    await ElMessageBox.confirm(
      '最后确认：您真的要重置所有抽奖数据吗？\n\n这将删除所有中奖记录和相关数据！',
      '最终确认',
      {
        confirmButtonText: '我确认要重置',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: true
      }
    )
    
    resetLoading.value = true
    
    // 调用后端重置API
    const result = await lotteryAPI.reset()
    
    ElMessage.success({
      message: '抽奖数据重置成功！所有中奖记录已清空，奖项数量已恢复。',
      duration: 5000
    })
    
    // 重新获取所有数据
    await Promise.all([
      fetchParticipants(),
      fetchAwards(),
      fetchLotteryRecords(),
      fetchStatistics()
    ])
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置抽奖数据失败:', error)
      ElMessage.error('重置抽奖数据失败：' + (error.response?.data?.error || error.message))
    }
  } finally {
    resetLoading.value = false
  }
}

// 获取奖项等级标签类型
const getAwardLevelType = (level) => {
  const levelNum = parseInt(level)
  switch (levelNum) {
    case 1:
      return 'danger'  // 红色 - 一等奖
    case 2:
      return 'warning' // 橙色 - 二等奖
    case 3:
      return 'success' // 绿色 - 三等奖
    default:
      return 'info'    // 蓝色 - 其他奖项
  }
}

// 获取系统配置
const fetchSystemConfig = async () => {
  try {
    const response = await fetch('/api/lottery/system-config');
    
    // 检查响应状态
    if (!response.ok) {
      console.warn(`API响应状态: ${response.status}`);
      return;
    }
    
    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('API响应不是JSON格式');
      return;
    }
    
    const text = await response.text();
    if (!text.trim()) {
      console.warn('API响应为空');
      return;
    }
    
    const data = JSON.parse(text);
    if (data.success && data.config) {
      settings.value.winnerDisplayDelay = data.config.winnerDisplayDelay || 0;
    }
  } catch (error) {
    console.error('获取系统配置失败:', error);
    // 使用默认值，不影响页面正常使用
    if (!settings.value.winnerDisplayDelay && settings.value.winnerDisplayDelay !== 0) {
      settings.value.winnerDisplayDelay = 0;
    }
  }
};

// 生命周期
onMounted(async () => {
  // 初始化数据
  console.log('管理员页面已加载')
  await fetchParticipants()
  await fetchAwards()
  await fetchLotteryRecords()
  await fetchStatistics()
  await fetchStatisticsData()
  await loadMultiWinConfig()
  await fetchSystemConfig()
  await nextTick()
  initNormalityChart()
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

/* 统计分析区域 */
.statistics-section {
  margin-bottom: 32px;
}

.statistics-section .section-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  border-radius: 12px 12px 0 0;
  margin-bottom: 0;
}

.statistics-section .section-title {
  color: white;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

/* 分析网格 */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  background: white;
  padding: 24px;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 分析卡片 */
.analysis-card {
  background: linear-gradient(145deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.analysis-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.analysis-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.analysis-card h4 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.analysis-card h4::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
  display: inline-block;
}

/* 正态分布检验样式 */
.normality-test {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.test-result {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
}

.result-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.result-status.normal {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #86efac;
}

.result-status.abnormal {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.test-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.detail-item {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.detail-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.detail-item .label {
  display: block;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item .value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

/* 公平性分析样式 */
.fairness-analysis {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fairness-score {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.fairness-score.good {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #86efac;
}

.fairness-score.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.fairness-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
  position: relative;
}

.chart-card h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

/* 分布图表样式 */
.distribution-chart {
  padding: 16px 0;
}

.chart-bars {
  display: flex;
  align-items: end;
  gap: 12px;
  height: 200px;
  padding: 0 8px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar {
  width: 100%;
  min-height: 4px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  position: relative;
}

.bar:hover {
  background: linear-gradient(180deg, #5a67d8 0%, #6b46c1 100%);
  transform: scaleY(1.05);
}

.bar-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.bar-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

/* 部门图表样式 */
.department-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}

.dept-item {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
}

.dept-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
  transform: translateX(4px);
}

.dept-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.dept-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.dept-stats span {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.dept-stats .total {
  background: #f1f5f9;
  color: #475569;
}

.dept-stats .winners {
  background: #dcfce7;
  color: #166534;
}

.dept-stats .rate {
  background: #dbeafe;
  color: #1e40af;
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

/* 设置页面样式 */
.settings-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.danger-section {
  border: 1px solid #f56c6c;
  background: #fef0f0;
}

.danger-title {
  color: #f56c6c;
}

.danger-content {
  background: white;
  border-radius: 6px;
  padding: 20px;
  border: 1px solid #fde2e2;
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.danger-info {
  flex: 1;
}

.danger-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.danger-info p {
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.5;
}

.reset-details {
  margin: 0;
  padding-left: 20px;
  color: #909399;
}

.reset-details li {
  margin-bottom: 4px;
  font-size: 14px;
}

/* 导入区域 */
.import-section {
  padding: 20px 0;
}

.import-tips {
  background-color: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.import-tips h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
  font-size: 14px;
  font-weight: 600;
}

.import-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #0c4a6e;
}

.import-tips li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.import-tips strong {
  color: #1e40af;
  font-weight: 600;
}

.upload-demo {
  margin-top: 16px;
}

.el-upload__tip {
  color: #606266;
  font-size: 12px;
  margin-top: 8px;
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

/* 导出对话框样式 */
.export-info {
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}

.export-info p {
  margin: 0;
  color: #0369a1;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #475569;
}

.el-radio {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.el-radio:hover {
  background-color: #f8fafc;
}

.el-radio .el-icon {
  margin-right: 6px;
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
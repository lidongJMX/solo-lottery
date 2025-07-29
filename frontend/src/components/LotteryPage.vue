<!-- 代码已包含 CSS：使用 TailwindCSS , 安装 TailwindCSS 后方可看到布局样式效果 -->
<template>
  <div class="min-h-screen bg-red-600 flex items-center justify-center py-6"
    :style="{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }">
    <!-- 可编辑标题 -->
    <div class="fixed top-2 left-4 z-10">
      <div v-if="!isEditing" @dblclick="startEdit"
        class="text-white font-bold cursor-pointer hover:text-yellow-400 transition-colors duration-200 bg-transparent px-3 py-2 rounded"
        style="font-size: 25px;">
        {{ organizationName }}
      </div>
      <input v-else ref="editInput" v-model="organizationName" @blur="stopEdit" @keyup.enter="stopEdit"
        class="text-white font-bold  outline-none" style="font-size: 25px;" type="text">
    </div>
    <div class="w-[1440px] max-w-full relative">
      <!-- 主要内容 -->
      <div class="max-w-[1200px] mx-auto mt-0 rounded-lg p-8">
        <!-- 奖项展示 -->
        <div class="flex flex-col items-center">
          <!-- 奖项信息容器 -->
          <div class="flex flex-col items-center rounded-xl w-full relative">
            <div
              class="w-[300px] h-[300px] bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-2 border-yellow-400 shadow-xl rounded-lg p-4 mb-4 backdrop-blur-sm transition-all duration-1000 transform-gpu"
              :class="{ 'scale-0 opacity-0': showWinnerNames }">
              <img :src="currentAward.image" :alt="currentAward.description"
                class="w-full h-full object-contain transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">
            </div>

            <!-- items-center: 默认显示的奖项信息 -->
            <div class="items-center transition-all duration-1000 transform-gpu"
              :class="{ 'scale-0 opacity-0': showWinnerNames }">
              <h2 class="text-yellow-400 text-xl font-bold mb-2 text-center transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentAward.name }}</h2>
              <p class="text-white text-base mb-4 text-center transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentAward.description }}</p>
            </div>

            <!-- items-name: 抽奖时显示的参与者姓名 -->
            <div
              class="items-name absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-700 ease-in-out bg-gradient-to-br from-red-600/90 via-red-700/95 to-red-800/90 backdrop-blur-sm transform-gpu will-change-transform shadow-inner border-4 border-yellow-400/60"
              :class="{ 'opacity-100 visible scale-100 translate-y-0': showWinnerNames, 'opacity-0 invisible scale-95 translate-y-2': !showWinnerNames }"
              :style="{ borderImageSource: `url(${cjbgImage})` }">
              <div class="w-full h-full flex items-center justify-center p-0">
                <!-- 抽奖中显示滚动的人名，抽奖结束显示中奖者 -->
                <div class="grid gap-6 w-full h-full place-items-center place-content-center" :class="{
                  'grid-cols-1': (isDrawing ? drawCount : currentWinners.length) <= 1,
                  'grid-cols-2': (isDrawing ? drawCount : currentWinners.length) === 2,
                  'grid-cols-3': (isDrawing ? drawCount : currentWinners.length) >= 3 && (isDrawing ? drawCount : currentWinners.length) <= 6,
                  'grid-cols-4': (isDrawing ? drawCount : currentWinners.length) > 6
                }">
                  <!-- 抽奖中显示滚动人名 -->
                  <template v-if="isDrawing">
                    <div v-for="index in drawCount" :key="index"
                      class="text-yellow-300 text-4xl font-bold transition-all duration-300 drop-shadow-lg">
                      {{ rollingNames[index - 1] || '参与者' }}
                    </div>

                  </template>
                  <!-- 抽奖结束显示中奖者 -->
                  <template v-else-if="currentWinners.length > 0">
                    <div v-for="(winner, index) in currentWinners" :key="index"
                      class="text-yellow-400 text-4xl font-bold">
                      {{ winner.name }}
                    </div>
                  </template>
                </div>
              </div>
            </div>

          </div>
          <!-- 控制面板 -->
          <div
            class="mt-4 flex items-center justify-center gap-4 bg-gradient-to-r from-red-700/20 to-yellow-600/20 border border-yellow-400/30 p-4 rounded-lg max-w-4xl mx-auto backdrop-blur-sm">
            <!-- 数量控制 -->
            <div class="flex items-center gap-2">
              <el-input-number 
                v-model="drawCount" 
                :min="1" 
                :max="currentAward.count || 10" 
                class="!rounded-button custom-input-number"
                @change="updateDrawCount" 
              />
            </div>
            <!-- 奖项选择 -->
            <div class="flex items-center gap-2">
              <el-button :icon="ArrowLeft" type="default"
                class="!rounded-button !bg-yellow-500/20 !border-yellow-400 !text-yellow-300 hover:!bg-yellow-500/30 hover:!text-yellow-200"
                :disabled="currentIndex === 0" @click="selectAward(currentIndex - 1)">
              </el-button>
              <span class="text-yellow-300 text-lg px-3 font-semibold">{{ currentAward.name }}</span>
              <el-button :icon="ArrowRight" type="default"
                class="!rounded-button !bg-yellow-500/20 !border-yellow-400 !text-yellow-300 hover:!bg-yellow-500/30 hover:!text-yellow-200"
                :disabled="currentIndex === awards.length - 1" @click="selectAward(currentIndex + 1)">
              </el-button>
            </div>



            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <el-button type="success" :disabled="isDrawing || remainingCount === 0"
                class="!rounded-button whitespace-nowrap !bg-gradient-to-r !from-red-600 !to-red-700 !border-red-600 hover:!from-red-700 hover:!to-red-800 !text-yellow-100 !font-semibold"
                @click="startDraw">
                {{ isDrawing ? '抽奖中...' : '开始抽奖' }}
              </el-button>
              <el-button type="warning"
                class="!rounded-button whitespace-nowrap !bg-gradient-to-r !from-yellow-500 !to-yellow-600 !border-yellow-500 hover:!from-yellow-600 hover:!to-yellow-700 !text-red-800 !font-semibold"
                @click="showWinners">
                中奖名单
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 下一轮按钮 -->
      <div class="absolute bottom-4 right-4">
        <el-button type="primary" size="large"
          class="!rounded-button !bg-gradient-to-r !from-yellow-500 !to-yellow-600 !border-yellow-500 hover:!from-yellow-600 hover:!to-yellow-700 !text-red-800 !font-bold !shadow-lg"
          @click="nextRound">
          下一轮
        </el-button>
      </div>
    </div>

    <!-- 中奖名单对话框 -->
    <el-dialog v-model="dialogVisible" title="中奖名单" width="30%">
      <el-table :data="winners" style="width: 100%">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="award" label="奖项" />
      </el-table>
    </el-dialog>

    <!-- 醒目的中奖弹窗 -->
    <div v-if="showWinnerDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      @click="closeWinnerDialog">
      <div
        class="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl p-8 mx-4 max-w-4xl w-full shadow-2xl"
        @click.stop>
        <!-- 装饰性边框 -->
        <div class="absolute inset-0 rounded-3xl border-4 border-yellow-400 opacity-75"></div>
        <div class="absolute inset-2 rounded-2xl border-2 border-yellow-300"></div>

        <!-- 关闭按钮 -->
        <button @click="closeWinnerDialog"
          class="absolute top-4 right-4 text-yellow-300 hover:text-yellow-100 text-2xl font-bold z-10">
          ×
        </button>

        <!-- 标题 -->
        <div class="text-center mb-8 relative z-10">
          <h1 class="text-6xl font-bold text-yellow-300 mb-4">
            🎉 恭喜中奖 🎉
          </h1>
          <div class="text-2xl text-yellow-200 font-semibold">
            {{ currentAward.name }}
          </div>
        </div>

        <!-- 中奖者列表 -->
        <div class="relative z-10">
          <div class="grid gap-6 place-items-center" :class="{
            'grid-cols-1': currentWinners.length <= 1,
            'grid-cols-2': currentWinners.length === 2,
            'grid-cols-3': currentWinners.length >= 3 && currentWinners.length <= 6,
            'grid-cols-4': currentWinners.length > 6
          }">
            <div v-for="(winner, index) in currentWinners" :key="index"
              class="bg-yellow-400 text-red-800 px-8 py-4 rounded-2xl shadow-lg text-center">
              <div class="text-3xl font-bold mb-2">{{ winner.name }}</div>
              <div class="text-lg text-red-600">{{ winner.department || '未知部门' }}</div>
            </div>
          </div>
        </div>
        <!-- 背景装饰 -->
        <div class="absolute inset-0 overflow-hidden rounded-3xl">
          <div class="absolute -top-10 -left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-20"></div>
          <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-10"></div>
          <div class="absolute top-1/2 left-10 w-16 h-16 bg-yellow-500 rounded-full opacity-15"></div>
          <div class="absolute top-20 right-20 w-12 h-12 bg-yellow-400 rounded-full opacity-25"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, nextTick } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { awardAPI, lotteryAPI, participantAPI } from '../api/index.js';

// 可编辑组织名称
const organizationName = ref('山西省计算机软件学会');
const isEditing = ref(false);
const editInput = ref(null);

// 开始编辑
const startEdit = () => {
  isEditing.value = true;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
};

// 停止编辑
const stopEdit = () => {
  isEditing.value = false;
};

// 奖项数据从数据库获取
const awards = ref([]);
const awardsLoading = ref(false);

// 获取奖项数据
const fetchAwards = async () => {
  try {
    awardsLoading.value = true;
    const data = await awardAPI.getConfig();
    // 转换数据格式并生成图片路径
    awards.value = data.map(award => ({
      id: award.id,
      level: award.level,
      name: award.name,
      description: award.description,
      count: award.total_count,
      remaining_count: award.remaining_count,
      draw_count: award.draw_count || 1,
      image: new URL(`../assets/award/${award.name}.png`, import.meta.url).href
    }));

    console.log('awards', awards.value);
    // 如果有奖项数据，设置当前奖项
    if (awards.value.length > 0) {
      currentAward.value = awards.value[0];
      // 同步初始化抽取数量
      drawCount.value = currentAward.value?.draw_count || 1;
    }
  } catch (error) {
    console.error('获取奖项数据失败:', error);
    // 如果获取失败，使用默认数据
    awards.value = [
      {
        id: 1,
        level: 1,
        name: '小天鹅 LittleSwan 洗烘套装',
        description: '高端洗烘套装',
        count: 1,
        remaining_count: 1,
        draw_count: 1,
        image: new URL('../assets/award/一等奖.png', import.meta.url).href
      },
      {
        id: 2,
        level: 2,
        name: '戴森吸尘器',
        description: '无线吸尘器',
        count: 2,
        remaining_count: 2,
        draw_count: 1,
        image: new URL('../assets/award/二等奖.png', import.meta.url).href
      },
      {
        id: 3,
        level: 3,
        name: '华为智能手表',
        description: '智能穿戴设备',
        count: 3,
        remaining_count: 3,
        draw_count: 1,
        image: new URL('../assets/award/三等奖.png', import.meta.url).href
      }
    ];
    currentAward.value = awards.value[0];
    // 同步初始化抽取数量
    drawCount.value = currentAward.value?.draw_count || 1;
  } finally {
    awardsLoading.value = false;
  }
};

const currentIndex = ref(0);
const currentAward = ref({});
const dialogVisible = ref(false);
const isDrawing = ref(false);
// 抽取数量使用ref，与currentAward.draw_count同步
const drawCount = ref(1);
// 剩余数量基于当前奖项的remaining_count
const remainingCount = computed(() => {
  return currentAward.value?.remaining_count || 0;
});
const showWinnerNames = ref(false);
const currentWinners = ref([]);
const rollingNames = ref([]);
const rollingTimer = ref(null);
const showWinnerDialog = ref(false);
const isSlowingDown = ref(false);
const slowDownStartTime = ref(0);
const slowDownDuration = 2000; // 3秒减速时间

// 背景图片
const backgroundImage = new URL('../assets/background/c.png', import.meta.url).href;

// 参与者数据从API获取
const participants = ref([]);
const participantsLoading = ref(false);

// 获取参与者完整信息列表
const fetchParticipants = async () => {
  try {
    participantsLoading.value = true;
    const participantData = await participantAPI.getAvailable();
    participants.value = participantData;
  } catch (error) {
    console.error('获取参与者列表失败:', error);
    ElMessage.error('获取参与者列表失败');
    // 如果API失败，使用备用数据
    participants.value = [
      { name: '张雨晨', department: '技术部' },
      { name: '李思成', department: '技术部' },
      { name: '王梓萱', department: '技术部' },
      { name: '陈宇航', department: '技术部' },
      { name: '刘欣怡', department: '技术部' },
      { name: '黄子豪', department: '技术部' },
      { name: '周美玲', department: '技术部' },
      { name: '吴承翰', department: '技术部' },
      { name: '赵雅婷', department: '技术部' },
      { name: '孙浩然', department: '技术部' }
    ];
  } finally {
    participantsLoading.value = false;
  }
};

const winners = ref([]);

// 随机抽取指定数量的中奖者
const drawWinners = () => {
  const availableParticipants = participants.value.filter(
    p => !winners.value.some(w => w.name === p.name)
  );

  const count = Math.min(drawCount.value, availableParticipants.length, remainingCount.value);
  const drawnWinners = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const winner = availableParticipants.splice(randomIndex, 1)[0];
    drawnWinners.push({
      name: winner.name,
      department: winner.department,
      award: `${currentAward.value.level}等奖 - ${currentAward.value.name}`
    });
  }

  winners.value = [...winners.value, ...drawnWinners];
  // 注意：remainingCount现在是computed属性，会自动从数据库更新
  // 实际的剩余数量更新应该通过后端API处理
};

const selectAward = (index) => {
  currentIndex.value = index;
  currentAward.value = awards.value[index];
  // 同步更新抽取数量
  drawCount.value = currentAward.value?.draw_count || 1;
};

// 更新抽取数量
const updateDrawCount = async (newValue) => {
  if (!currentAward.value || !newValue) return;
  
  try {
    // 验证数量范围
    if (newValue < 1 || newValue > currentAward.value.count) {
      ElMessage.error(`抽取数量必须在1到${currentAward.value.count}之间`);
      return;
    }
    console.log('currentAward', currentAward);
    // 调用后端API更新奖项的draw_count
    const updateData = {
      level: currentAward.value.level,
      name: currentAward.value.name,
      description: currentAward.value.description,
      count: currentAward.value.count,
      draw_count: newValue
    };
    
    await awardAPI.update(currentAward.value.id, updateData);
    
    // 更新本地数据
    currentAward.value.draw_count = newValue;
    
    // 同步更新awards数组中的数据
    const awardIndex = awards.value.findIndex(award => award.id === currentAward.value.id);
    if (awardIndex !== -1) {
      awards.value[awardIndex].draw_count = newValue;
    }
    
    console.log(`奖项 ${currentAward.value.name} 的抽取数量已更新为 ${newValue}`);
  } catch (error) {
    console.error('更新抽取数量失败:', error);
    ElMessage.error('更新抽取数量失败');
    // 重新获取数据以恢复正确状态
    await fetchAwards();
  }
};

const startDraw = () => {
  if (isDrawing.value || remainingCount.value === 0) return;

  isDrawing.value = true;
  isSlowingDown.value = false;
  showWinnerNames.value = true;
  currentWinners.value = [];

  // 初始化滚动人名数组
  rollingNames.value = new Array(drawCount.value).fill('');

  // 开始人名滚动
  startRolling();

  // 添加键盘监听
  document.addEventListener('keydown', handleKeyPress);
};

// 开始人名滚动
const startRolling = () => {
  const updateNames = () => {
    const availableParticipants = participants.value.filter(
      p => !winners.value.some(w => w.name === p.name)
    );

    for (let i = 0; i < drawCount.value; i++) {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      rollingNames.value[i] = availableParticipants[randomIndex]?.name || '参与者';
    }
  };

  const roll = () => {
    if (!isDrawing.value) return;
    
    updateNames();
    
    let interval = 100; // 初始间隔100ms，滚动很快
    
    if (isSlowingDown.value) {
      // 计算减速进度 (0-1)
      const elapsed = Date.now() - slowDownStartTime.value;
      const progress = Math.min(elapsed / slowDownDuration, 1);
      
      // 使用缓动函数实现平滑减速
      const easeOut = 1 - Math.pow(1 - progress, 3);
      interval = 100 + (1500 * easeOut); // 从100ms逐渐增加到1600ms
      
      if (progress >= 1) {
        // 减速完成，停止抽奖
        finalizeDraw();
        return;
      }
    }
    
    rollingTimer.value = setTimeout(roll, interval);
  };
  
  roll();
};

// 开始减速停止抽奖
const stopDraw = () => {
  if (!isDrawing.value || isSlowingDown.value) return;

  // 开始减速过程
  isSlowingDown.value = true;
  slowDownStartTime.value = Date.now();
};

// 最终确定中奖者
const finalizeDraw = () => {
  // 清除定时器
  if (rollingTimer.value) {
    clearTimeout(rollingTimer.value);
    rollingTimer.value = null;
  }

  // 移除键盘监听
  document.removeEventListener('keydown', handleKeyPress);

  // 确定最终中奖者
  drawWinners();

  // 更新当前中奖者列表
  const latestWinners = winners.value.slice(-drawCount.value);
  currentWinners.value = latestWinners;

  // 重置状态
  isDrawing.value = false;
  isSlowingDown.value = false;

  // 显示中奖弹窗
  setTimeout(() => {
    showWinnerDialog.value = true;
  }, 500);
};

// 键盘事件处理
const handleKeyPress = (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    stopDraw();
  }
};

// 关闭中奖弹窗
const closeWinnerDialog = () => {
  showWinnerDialog.value = false;
  // 重置动画状态
  setTimeout(() => {
    showWinnerNames.value = false;
    currentWinners.value = [];
    rollingNames.value = [];
    isSlowingDown.value = false;
  }, 300);
};

// 组件卸载时清理
onUnmounted(() => {
  if (rollingTimer.value) {
    clearTimeout(rollingTimer.value);
  }
  document.removeEventListener('keydown', handleKeyPress);
});

const showWinners = () => {
  // 设置当前中奖者为所有中奖者
  currentWinners.value = winners.value;
  // 显示醒目的中奖弹窗
  showWinnerDialog.value = true;
};

// 下一轮抽奖
const nextRound = async () => {
  try {
    const data = await lotteryAPI.nextRound();
    
    if (data.success) {
      // 显示成功消息
      ElMessage.success(data.message);
      
      // 重新获取奖项数据和参与者数据
      await fetchAwards();
      await fetchParticipants();
      
      // 重置抽奖状态
      currentIndex.value = 0;
      currentAward.value = null;
      drawCount.value = 1;
      winners.value = [];
      isDrawing.value = false;
      showWinnerDialog.value = false;
    } else {
      ElMessage.error(data.error || '开始新轮次失败');
    }
  } catch (error) {
    console.error('开始新轮次失败:', error);
    ElMessage.error('开始新轮次失败，请检查网络连接');
  }
};

// 组件挂载时获取奖项数据
onMounted(async () => {
  await fetchAwards();
  await fetchParticipants();
});
</script>

<style scoped>
.el-dialog {
  border-radius: 8px;
}

.el-button {
  font-size: 16px;
  padding: 12px 24px;
}

.el-input-number {
  width: 120px;
  background: white;
  border-radius: 4px;
}

.custom-input-number :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #fbbf24 !important;
  border-radius: 6px !important;
}

.custom-input-number :deep(.el-input__inner) {
  color: #dc2626 !important;
  font-weight: 600 !important;
  text-align: center !important;
}

.custom-input-number :deep(.el-input-number__decrease),
.custom-input-number :deep(.el-input-number__increase) {
  background: #fbbf24 !important;
  border-color: #fbbf24 !important;
  color: #dc2626 !important;
  font-weight: bold !important;
}

.custom-input-number :deep(.el-input-number__decrease:hover),
.custom-input-number :deep(.el-input-number__increase:hover) {
  background: #f59e0b !important;
  border-color: #f59e0b !important;
}

:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  border-radius: 4px !important;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f5f7fa;
  --el-table-row-hover-bg-color: #f5f7fa;
}
</style>
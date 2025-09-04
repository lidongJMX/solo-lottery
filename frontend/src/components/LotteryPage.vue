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
              <!-- <h2 class="text-yellow-400 text-xl font-bold mb-2 text-center transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentAward.name }}</h2> -->
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
              <el-input-number v-model="drawCount" :min="1" :max="currentAward.count || 10"
                class="!rounded-button custom-input-number" @change="updateDrawCount" />
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
              <!-- <el-button type="danger" :disabled="!isDrawing || isSlowingDown"
                class="!rounded-button whitespace-nowrap !bg-gradient-to-r !from-orange-500 !to-orange-600 !border-orange-500 hover:!from-orange-600 hover:!to-orange-700 !text-white !font-semibold"
                @click="stopDraw">
                停止抽奖
              </el-button> -->
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
      <div class="fixed bottom-4 right-4">
        <el-button type="primary" size="medium"
          class="!rounded-button !bg-gradient-to-r !from-yellow-500 !to-yellow-600 !border-yellow-500 hover:!from-yellow-600 hover:!to-yellow-700 !text-red-800 !font-bold !shadow-lg"
          @click="nextRound">
          下一轮
          <span style="font-size: 12px;">(当前第{{ currentEpoch}}轮)</span>
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      @click="closeWinnerDialog">
      <div
        class="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        :class="{
          'w-full max-w-md': currentWinners.length <= 1,
          'w-full max-w-2xl': currentWinners.length === 2,
          'w-full max-w-4xl': currentWinners.length >= 3 && currentWinners.length <= 6,
          'w-full max-w-6xl': currentWinners.length > 6 && currentWinners.length <= 12,
          'w-full max-w-7xl': currentWinners.length > 12
        }"
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
          <div class="grid gap-4 place-items-center justify-items-center" :class="{
            'grid-cols-1': currentWinners.length <= 1,
            'grid-cols-2': currentWinners.length === 2,
            'grid-cols-3': currentWinners.length >= 3 && currentWinners.length <= 6,
            'grid-cols-4': currentWinners.length > 6 && currentWinners.length <= 12,
            'grid-cols-5': currentWinners.length > 12 && currentWinners.length <= 20,
            'grid-cols-6': currentWinners.length > 20
          }">
            <div v-for="(winner, index) in currentWinners" :key="index"
              class="bg-yellow-400 text-red-800 px-4 py-3 rounded-2xl shadow-lg text-center w-full"
              :class="{
                'min-w-[200px] max-w-[280px]': currentWinners.length <= 6,
                'min-w-[160px] max-w-[200px]': currentWinners.length > 6 && currentWinners.length <= 12,
                'min-w-[140px] max-w-[160px]': currentWinners.length > 12 && currentWinners.length <= 20,
                'min-w-[120px] max-w-[140px]': currentWinners.length > 20
              }">
              <div class="font-bold mb-1 break-words"
                :class="{
                  'text-3xl': currentWinners.length <= 6,
                  'text-2xl': currentWinners.length > 6 && currentWinners.length <= 12,
                  'text-xl': currentWinners.length > 12 && currentWinners.length <= 20,
                  'text-lg': currentWinners.length > 20
                }">{{ winner.name }}</div>
              <div class="text-red-600 break-words"
                :class="{
                  'text-lg': currentWinners.length <= 6,
                  'text-base': currentWinners.length > 6 && currentWinners.length <= 12,
                  'text-sm': currentWinners.length > 12 && currentWinners.length <= 20,
                  'text-xs': currentWinners.length > 20
                }">{{ winner.department || '未知部门' }}</div>
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
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, nextTick } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { awardAPI, lotteryAPI, participantAPI } from '../api/index.js';
import BottomNavigation from './BottomNavigation.vue';

// 音频文件引用
const processAudio = new Audio(new URL('../assets/sound/process.wav', import.meta.url).href);
const endAudio = new Audio(new URL('../assets/sound/end.wav', import.meta.url).href);

// 设置音频属性
processAudio.loop = true; // 抽奖过程音乐循环播放
processAudio.volume = 0.6; // 设置音量
endAudio.volume = 0.8; // 设置音量

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

// 轮次信息
const currentEpoch = ref(1);
const epochStatus = ref(1);

// 系统配置
const systemConfig = ref({
  winnerDisplayDelay: 500 // 默认值
});

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
        name: '一等奖',
        description: '小天鹅洗衣机',
        count: 50,
        remaining_count: 50,
        draw_count: 5,
        image: new URL('../assets/award/一等奖.png', import.meta.url).href
      },
      {
        id: 2,
        level: 2,
        name: '二等奖',
        description: '戴森吹风机',
        count: 100,
        remaining_count: 100,
        draw_count: 10,
        image: new URL('../assets/award/二等奖.png', import.meta.url).href
      },
      {
        id: 3,
        level: 3,
        name: '三等奖',
        description: '智能运动手表，健康生活伴侣',
        count: 150,
        remaining_count: 150,
        draw_count: 15,
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

// 获取系统配置
const fetchSystemConfig = async () => {
  try {
    const response = await fetch('/api/lottery/system-config');
    
    // 检查响应状态
    if (!response.ok) {
      console.warn(`API响应状态: ${response.status}`);
      systemConfig.value = { winnerDisplayDelay: 500 };
      return;
    }
    
    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('API响应不是JSON格式');
      systemConfig.value = { winnerDisplayDelay: 500 };
      return;
    }
    
    const text = await response.text();
    if (!text.trim()) {
      console.warn('API响应为空');
      systemConfig.value = { winnerDisplayDelay: 500 };
      return;
    }
    
    const data = JSON.parse(text);
    if (data.success && data.config) {
      systemConfig.value = {
        winnerDisplayDelay: data.config.winnerDisplayDelay || 500
      };
    } else {
      systemConfig.value = { winnerDisplayDelay: 500 };
    }
  } catch (error) {
    console.error('获取系统配置失败:', error);
    // 使用默认配置
    systemConfig.value = {
      winnerDisplayDelay: 500
    };
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
// 减速时间根据配置动态计算
const getSlowDownDuration = () => {
  // 如果设置为立即显示，则立即停止（100ms最小减速时间）
  if (systemConfig.value.winnerDisplayDelay === 0) {
    return 100;
  }
  // 否则使用配置的延迟时间作为减速时间
  return systemConfig.value.winnerDisplayDelay;
};
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

// 获取抽奖状态和轮次信息
const fetchLotteryStatus = async () => {
  try {
    const statusData = await lotteryAPI.getStatus();
    currentEpoch.value = statusData.currentEpoch || 0;
    epochStatus.value = statusData.epochStatus || 1;
  } catch (error) {
    console.error('获取抽奖状态失败:', error);
    // 使用默认值
    currentEpoch.value = 0;
    epochStatus.value = 1;
  }
};

const winners = ref([]);

// 调用后端API执行抽奖
const drawWinners = async () => {
  try {
    const drawData = {
      awardId: currentAward.value.id,
      count: drawCount.value
    };
    
    const result = await lotteryAPI.draw(drawData);
    
    if (result.success) {
      // 更新中奖者列表
      const newWinners = result.winners.map(winner => ({
        id: winner.id,
        name: winner.participant.name,
        department: winner.participant.department,
        award: winner.award,
        draw_time: winner.draw_time
      }));
      
      winners.value = [...winners.value, ...newWinners];
      
      // 保存当前选中的奖项索引
      const savedIndex = currentIndex.value;
      const savedAwardId = currentAward.value.id;
      
      // 重新获取奖项数据以更新剩余数量
      await fetchAwards();
      
      // 恢复之前选中的奖项
      if (savedIndex >= 0 && savedIndex < awards.value.length) {
        currentIndex.value = savedIndex;
        currentAward.value = awards.value[savedIndex];
        drawCount.value = currentAward.value?.draw_count || 1;
      } else {
        // 如果索引无效，尝试通过ID找到对应的奖项
        const foundIndex = awards.value.findIndex(award => award.id === savedAwardId);
        if (foundIndex !== -1) {
          currentIndex.value = foundIndex;
          currentAward.value = awards.value[foundIndex];
          drawCount.value = currentAward.value?.draw_count || 1;
        }
      }
      
      return newWinners;
    } else {
      ElMessage.error(result.error || '抽奖失败');
      return [];
    }
  } catch (error) {
    console.error('抽奖失败:', error);
    ElMessage.error('抽奖失败，请检查网络连接');
    return [];
  }
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

  // 播放抽奖过程音乐
  try {
    processAudio.currentTime = 0; // 重置播放位置
    processAudio.play().catch(error => {
      console.warn('播放抽奖音乐失败:', error);
    });
  } catch (error) {
    console.warn('播放抽奖音乐失败:', error);
  }

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
      const progress = Math.min(elapsed / getSlowDownDuration(), 1);
      
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
const finalizeDraw = async () => {
  // 停止抽奖过程音乐
  try {
    processAudio.pause();
    processAudio.currentTime = 0;
  } catch (error) {
    console.warn('停止抽奖音乐失败:', error);
  }

  // 清除定时器
  if (rollingTimer.value) {
    clearTimeout(rollingTimer.value);
    rollingTimer.value = null;
  }

  // 移除键盘监听
  document.removeEventListener('keydown', handleKeyPress);

  try {
    // 确定最终中奖者
    const newWinners = await drawWinners();
    
    if (newWinners && newWinners.length > 0) {
      // 播放结束音乐
      try {
        endAudio.currentTime = 0; // 重置播放位置
        endAudio.play().catch(error => {
          console.warn('播放结束音乐失败:', error);
        });
      } catch (error) {
        console.warn('播放结束音乐失败:', error);
      }

      // 更新当前中奖者列表
      currentWinners.value = newWinners;
      
      // 显示中奖弹窗
      // 如果设置为立即显示，则不再有额外延迟（因为减速时间已经包含了延迟）
      if (systemConfig.value.winnerDisplayDelay === 0) {
        showWinnerDialog.value = true;
      } else {
        // 对于非立即显示，减速时间就是延迟时间，所以立即显示
        showWinnerDialog.value = true;
      }
    } else {
      ElMessage.error('抽奖失败，请重试');
    }
  } catch (error) {
    console.error('抽奖失败:', error);
    ElMessage.error('抽奖失败，请重试');
  } finally {
    // 重置状态
    isDrawing.value = false;
    isSlowingDown.value = false;
  }
};

// 键盘事件处理
const handleKeyPress = (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    // 立即停止抽奖并显示中奖者
    immediateStop();
  }
};

// 立即停止抽奖
const immediateStop = async () => {
  if (!isDrawing.value) return;

  // 立即停止滚动
  if (rollingTimer.value) {
    clearTimeout(rollingTimer.value);
    rollingTimer.value = null;
  }

  // 停止抽奖过程音乐
  try {
    processAudio.pause();
    processAudio.currentTime = 0;
  } catch (error) {
    console.warn('停止抽奖音乐失败:', error);
  }

  // 移除键盘监听
  document.removeEventListener('keydown', handleKeyPress);

  try {
    // 确定最终中奖者
    const newWinners = await drawWinners();
    
    if (newWinners && newWinners.length > 0) {
      // 播放结束音乐
      try {
        endAudio.currentTime = 0;
        endAudio.play().catch(error => {
          console.warn('播放结束音乐失败:', error);
        });
      } catch (error) {
        console.warn('播放结束音乐失败:', error);
      }

      // 更新当前中奖者列表
      currentWinners.value = newWinners;
      
      // 立即显示中奖弹窗
      showWinnerDialog.value = true;
    } else {
      ElMessage.error('抽奖失败，请重试');
    }
  } catch (error) {
    console.error('抽奖失败:', error);
    ElMessage.error('抽奖失败，请重试');
  } finally {
    // 重置状态
    isDrawing.value = false;
    isSlowingDown.value = false;
  }
};

// 关闭中奖弹窗
const closeWinnerDialog = () => {
  showWinnerDialog.value = false;
  // 重置动画状态，但保持当前奖项不变
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
  
  // 停止所有音频播放
  try {
    processAudio.pause();
    endAudio.pause();
  } catch (error) {
    console.warn('停止音频播放失败:', error);
  }
});

const showWinners = async () => {
  if (!currentAward.value) {
    ElMessage.warning('请先选择奖项');
    return;
  }
  
  try {
    // 调试信息：显示当前状态
    console.log('=== showWinners 调试信息 ===');
    console.log('currentAward:', currentAward.value);
    console.log('currentEpoch:', currentEpoch.value);
    console.log('showWinnerDialog初始值:', showWinnerDialog.value);

    // 获取当前轮次当前奖项的中奖者
    const winnersData = await lotteryAPI.getWinnersByAward(currentAward.value.id);
    console.log('winnersData',winnersData)
    if (winnersData && winnersData.length > 0) {
      // 筛选当前轮次的中奖者
      const currentRoundWinners = winnersData.filter(winner => winner.epoch === currentEpoch.value);
      
      if (currentRoundWinners.length > 0) {
        // 转换数据格式
        currentWinners.value = currentRoundWinners.map(winner => ({
          id: winner.id,
          name: winner.name,
          department: winner.department || '未知部门',
          award: winner.award,
          draw_time: winner.draw_time,
          epoch: winner.epoch
        }));
        // 显示中奖弹窗
        console.log('showWinnerDialog',showWinnerDialog.value)
        showWinnerDialog.value = true;
        console.log('showWinnerDialog设置后:', showWinnerDialog.value);
      } else {
        console.log('当前轮次无中奖者，currentEpoch:', currentEpoch.value);
        ElMessage.info(`第${currentEpoch.value}轮当前奖项暂无中奖者`);
      }
    } else {
      console.log('该奖项暂无任何中奖者');
      ElMessage.info('当前奖项暂无中奖者');
    }
  } catch (error) {
    console.error('获取中奖者信息失败:', error);
    ElMessage.error('获取中奖者信息失败');
  }
};

// 下一轮抽奖
const nextRound = async () => {
  try {
    const data = await lotteryAPI.nextRound();
    
    if (data.success) {
      // 显示成功消息
      ElMessage.success(data.message);
      
      // 更新轮次信息
      currentEpoch.value = data.currentEpoch;
      
      // 重新获取奖项数据和参与者数据
      await fetchAwards();
      await fetchParticipants();
      await fetchLotteryStatus();
      
      // 重置抽奖状态，但保持当前选中的奖项
      if (awards.value.length > 0) {
        // 如果当前奖项索引超出范围，则重置为0
        if (currentIndex.value >= awards.value.length) {
          currentIndex.value = 0;
        }
        currentAward.value = awards.value[currentIndex.value] || awards.value[0];
        drawCount.value = currentAward.value?.draw_count || 1;
      }
      winners.value = [];
      currentWinners.value = [];
      isDrawing.value = false;
      isSlowingDown.value = false;
      showWinnerNames.value = false;
      rollingNames.value = [];
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
  await fetchLotteryStatus();
  await fetchSystemConfig();
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
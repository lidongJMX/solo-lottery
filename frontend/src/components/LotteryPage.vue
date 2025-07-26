<!-- 代码已包含 CSS：使用 TailwindCSS , 安装 TailwindCSS 后方可看到布局样式效果 -->
<template>
  <div class="min-h-screen bg-red-600 flex items-center justify-center py-6"
    :style="{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }">
    <div class="w-[1440px] max-w-full relative">
      <!-- 可编辑标题 -->
      <div class="absolute top-1 left-4 z-10">
        <div v-if="!isEditing" @dblclick="startEdit"
          class="text-white font-bold cursor-pointer hover:text-yellow-400 transition-colors duration-200 bg-transparent px-3 py-2 rounded"
          style="font-size: 25px;">
          {{ organizationName }}
        </div>
        <input v-else ref="editInput" v-model="organizationName" @blur="stopEdit" @keyup.enter="stopEdit"
          class="text-white font-bold  outline-none" style="font-size: 25px;" type="text">
      </div>

      <!-- 主要内容 -->
      <div class="max-w-[1200px] mx-auto mt-20 rounded-lg p-8">
        <!-- 奖品展示 -->
        <div class="flex flex-col items-center">
          <!-- 奖品信息容器 -->
          <div class="flex flex-col items-center rounded-xl w-full relative">
            <div
              class="w-[300px] h-[300px] bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-2 border-yellow-400 shadow-xl rounded-lg p-4 mb-4 backdrop-blur-sm transition-all duration-1000 transform-gpu"
              :class="{ 'scale-0 opacity-0': showWinnerNames }">
              <img :src="currentPrize.image" :alt="currentPrize.name" class="w-full h-full object-contain transition-all duration-1000 transform-gpu" :class="{ 'scale-0 opacity-0': showWinnerNames }">
            </div>

            <!-- items-center: 默认显示的奖品信息 -->
            <div class="items-center transition-all duration-1000 transform-gpu" :class="{ 'scale-0 opacity-0': showWinnerNames }">
              <h2 class="text-yellow-400 text-xl font-bold mb-2 text-center transition-all duration-1000 transform-gpu" :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentPrize.level }}</h2>
              <p class="text-white text-base mb-4 text-center transition-all duration-1000 transform-gpu" :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentPrize.name }}</p>
            </div>

            <!-- items-name: 抽奖时显示的参与者姓名 -->
            <div class="items-name absolute top-0 left-0 w-full h-[392px] flex items-center justify-center transition-all duration-500 bg-white" 
                 :class="{ 'opacity-100 visible': showWinnerNames, 'opacity-0 invisible': !showWinnerNames }">
              <div class="text-center">
                <div v-for="(winner, index) in currentWinners" :key="index" class="text-red-600 text-4xl font-bold mb-4 animate-bounce">
                  {{ winner.name }}
                </div>
                <div v-if="currentWinners.length === 0 && isDrawing" class="text-red-600 text-4xl font-bold animate-pulse">
                  抽奖中...
                </div>
              </div>
            </div>

          </div>
          <!-- 控制面板 -->
          <div
            class="mt-4 flex items-center justify-center gap-4 bg-gradient-to-r from-red-700/20 to-yellow-600/20 border border-yellow-400/30 p-4 rounded-lg max-w-4xl mx-auto backdrop-blur-sm">
            <!-- 数量控制 -->
            <div class="flex items-center gap-2">
              <span class="text-yellow-300 font-medium"></span>
              <el-input-number v-model="drawCount" :min="1" :max="10" class="!rounded-button custom-input-number" />
            </div>
            <!-- 奖品选择 -->
            <div class="flex items-center gap-2">
              <el-button :icon="ArrowLeft" type="default"
                class="!rounded-button !bg-yellow-500/20 !border-yellow-400 !text-yellow-300 hover:!bg-yellow-500/30 hover:!text-yellow-200"
                :disabled="currentIndex === 0" @click="selectPrize(currentIndex - 1)">
              </el-button>
              <span class="text-yellow-300 text-lg px-3 font-semibold">{{ currentPrize.level }}</span>
              <el-button :icon="ArrowRight" type="default"
                class="!rounded-button !bg-yellow-500/20 !border-yellow-400 !text-yellow-300 hover:!bg-yellow-500/30 hover:!text-yellow-200"
                :disabled="currentIndex === prizes.length - 1" @click="selectPrize(currentIndex + 1)">
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
        <el-table-column prop="prize" label="奖品" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';

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

const prizes = ref([
  {
    level: '一等奖',
    name: '小天鹅 LittleSwan 洗烘套装',
    // image: 'https://ai-public.mastergo.com/ai/img_res/304a8126d488fa893ca027a2c8de9704.jpg'
    image: new URL('../assets/prize/一等奖.png', import.meta.url).href
  },
  {
    level: '二等奖',
    name: '戴森吸尘器',
    image: 'https://ai-public.mastergo.com/ai/img_res/52b3e08599c214acc6802d5f6fbb8503.jpg'
  },
  {
    level: '三等奖',
    name: '华为智能手表',
    image: 'https://ai-public.mastergo.com/ai/img_res/37bc491a791bc693235bc252a0725d3f.jpg'
  }
]);

const currentIndex = ref(0);
const currentPrize = ref(prizes.value[0]);
const dialogVisible = ref(false);
const isDrawing = ref(false);
const drawCount = ref(1);
const remainingCount = ref(10);
const showWinnerNames = ref(false);
const currentWinners = ref([]);

// 背景图片
const backgroundImage = new URL('../assets/background/c.png', import.meta.url).href;

// 模拟参与者数据
const participants = ref([
  '张雨晨', '李思成', '王梓萱', '陈宇航', '刘欣怡',
  '黄子豪', '周美玲', '吴承翰', '赵雅婷', '孙浩然',
  '徐子涵', '郭雨菲', '何俊杰', '马思琪', '朱天宇',
  '杨雨欣', '林子轩', '范思涵', '金子轩', '唐嘉怡'
]);

const winners = ref([]);

// 随机抽取指定数量的中奖者
const drawWinners = () => {
  const availableParticipants = participants.value.filter(
    p => !winners.value.some(w => w.name === p)
  );

  const count = Math.min(drawCount.value, availableParticipants.length, remainingCount.value);
  const drawnWinners = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const winner = availableParticipants.splice(randomIndex, 1)[0];
    drawnWinners.push({
      name: winner,
      prize: `${currentPrize.value.level} - ${currentPrize.value.name}`
    });
  }

  winners.value = [...winners.value, ...drawnWinners];
  remainingCount.value -= count;
};

const selectPrize = (index) => {
  currentIndex.value = index;
  currentPrize.value = prizes.value[index];
};

const startDraw = async () => {
  if (isDrawing.value || remainingCount.value === 0) return;

  isDrawing.value = true;

  // 隐藏items-center，显示items-name动画
  showWinnerNames.value = true;

  // 模拟抽奖动画效果
  await new Promise(resolve => setTimeout(resolve, 2000));

  drawWinners();

  // 更新当前中奖者列表用于显示
  const latestWinners = winners.value.slice(-drawCount.value);
  currentWinners.value = latestWinners;

  isDrawing.value = false;

  // 等待一段时间后显示中奖结果对话框
  await new Promise(resolve => setTimeout(resolve, 1000));
  dialogVisible.value = true;

  // 对话框关闭后重置动画状态
  setTimeout(() => {
    showWinnerNames.value = false;
    currentWinners.value = [];
  }, 3000);
};

const showWinners = () => {
  dialogVisible.value = true;
};

// 下一轮抽奖
const nextRound = () => {
  // 重置抽奖状态
  isDrawing.value = false;
  remainingCount.value = 10;
  // 可以选择是否清空中奖名单
  // winners.value = [];

  // 提示用户开始新一轮
  console.log('开始下一轮抽奖');
};
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
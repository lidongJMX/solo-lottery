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
              <img :src="currentPrize.image" :alt="currentPrize.name"
                class="w-full h-full object-contain transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">
            </div>

            <!-- items-center: 默认显示的奖项信息 -->
            <div class="items-center transition-all duration-1000 transform-gpu"
              :class="{ 'scale-0 opacity-0': showWinnerNames }">
              <h2 class="text-yellow-400 text-xl font-bold mb-2 text-center transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentPrize.level }}</h2>
              <p class="text-white text-base mb-4 text-center transition-all duration-1000 transform-gpu"
                :class="{ 'scale-0 opacity-0': showWinnerNames }">{{ currentPrize.name }}</p>
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
              <span class="text-yellow-300 font-medium"></span>
              <el-input-number v-model="drawCount" :min="1" :max="10" class="!rounded-button custom-input-number" />
            </div>
            <!-- 奖项选择 -->
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
        <el-table-column prop="award" label="奖项" />
      </el-table>
    </el-dialog>

    <!-- 醒目的中奖弹窗 -->
    <div v-if="winnerDialogVisible"
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
            {{ currentPrize.level }} - {{ currentPrize.name }}
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
              class="bg-yellow-400 text-red-800 px-8 py-4 rounded-2xl text-3xl font-bold shadow-lg">
              {{ winner.name }}
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
import { ref, computed, onUnmounted } from 'vue';
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
const rollingNames = ref([]);
const rollingTimer = ref(null);
const winnerDialogVisible = ref(false);

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
      award: `${currentPrize.value.level} - ${currentPrize.value.name}`
    });
  }

  winners.value = [...winners.value, ...drawnWinners];
  remainingCount.value -= count;
};

const selectPrize = (index) => {
  currentIndex.value = index;
  currentPrize.value = prizes.value[index];
};

const startDraw = () => {
  if (isDrawing.value || remainingCount.value === 0) return;

  isDrawing.value = true;
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
  rollingTimer.value = setInterval(() => {
    const availableParticipants = participants.value.filter(
      p => !winners.value.some(w => w.name === p)
    );

    for (let i = 0; i < drawCount.value; i++) {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      rollingNames.value[i] = availableParticipants[randomIndex] || '参与者';
    }
  }, 100); // 每100ms更换一次人名
};

// 停止抽奖
const stopDraw = () => {
  if (!isDrawing.value) return;

  // 清除定时器
  if (rollingTimer.value) {
    clearInterval(rollingTimer.value);
    rollingTimer.value = null;
  }

  // 移除键盘监听
  document.removeEventListener('keydown', handleKeyPress);

  // 确定最终中奖者
  drawWinners();

  // 更新当前中奖者列表
  const latestWinners = winners.value.slice(-drawCount.value);
  currentWinners.value = latestWinners;

  isDrawing.value = false;

  // 显示中奖弹窗
  setTimeout(() => {
    winnerDialogVisible.value = true;
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
  winnerDialogVisible.value = false;
  // 重置动画状态
  setTimeout(() => {
    showWinnerNames.value = false;
    currentWinners.value = [];
    rollingNames.value = [];
  }, 300);
};

// 组件卸载时清理
onUnmounted(() => {
  if (rollingTimer.value) {
    clearInterval(rollingTimer.value);
  }
  document.removeEventListener('keydown', handleKeyPress);
});

const showWinners = () => {
  // 设置当前中奖者为所有中奖者
  currentWinners.value = winners.value;
  // 显示醒目的中奖弹窗
  winnerDialogVisible.value = true;
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
<template>
  <div 
    class="bottom-navigation"
    @mouseenter="showNavigation"
    @mouseleave="hideNavigation"
    :class="{ 'visible': isVisible }"
  >
    <div class="nav-container">
      <!-- 主页按钮 -->
      <button 
        @click="goToHome" 
        class="nav-button"
        :class="{ 'active': currentRoute === 'Home' }"
        title="主页"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span class="nav-text">主页</span>
      </button>

      <!-- 抽奖页按钮 -->
      <button 
        @click="goToLottery" 
        class="nav-button"
        :class="{ 'active': currentRoute === 'Lottery' }"
        title="抽奖"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <span class="nav-text">抽奖</span>
      </button>

      <!-- 全屏按钮 -->
      <button 
        @click="toggleFullscreen" 
        class="nav-button"
        :title="isFullscreen ? '退出全屏' : '全屏显示'"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="!isFullscreen" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          <path v-else d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
        <span class="nav-text">{{ isFullscreen ? '退出' : '全屏' }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'BottomNavigation',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const isFullscreen = ref(false)
    const isVisible = ref(false)
    let hideTimer = null

    const currentRoute = computed(() => route.name)

    // 导航方法
    const goToHome = () => {
      router.push('/')
    }

    const goToLottery = () => {
      router.push('/lottery')
    }

    // 显示/隐藏导航栏
    const showNavigation = () => {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      isVisible.value = true
    }

    const hideNavigation = () => {
      hideTimer = setTimeout(() => {
        isVisible.value = false
      }, 300) // 延迟300ms隐藏
    }

    // 全屏功能
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('无法进入全屏模式:', err)
        })
      } else {
        document.exitFullscreen().catch(err => {
          console.log('无法退出全屏模式:', err)
        })
      }
    }

    // 监听全屏状态变化
    const handleFullscreenChange = () => {
      isFullscreen.value = !!document.fullscreenElement
    }

    onMounted(() => {
      document.addEventListener('fullscreenchange', handleFullscreenChange)
    })

    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (hideTimer) {
        clearTimeout(hideTimer)
      }
    })

    return {
      currentRoute,
      isFullscreen,
      isVisible,
      goToHome,
      goToLottery,
      toggleFullscreen,
      showNavigation,
      hideNavigation
    }
  }
}
</script>

<style scoped>
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 60px;
  display: flex;
  align-items: center;
}

.bottom-navigation.visible {
  transform: translateY(0);
}

/* 底部触发区域 */
.bottom-navigation::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 20px;
  background: transparent;
}

.nav-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 0 20px;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 60px;
  position: relative;
}

.nav-button:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  transform: translateY(-1px);
}

.nav-button.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}

.nav-button.active::after {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: #fbbf24;
  border-radius: 1px;
}

.nav-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
}

.nav-button:hover .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .nav-container {
    gap: 24px;
    padding: 0 15px;
  }
  
  .nav-button {
    min-width: 50px;
    padding: 4px 8px;
  }
  
  .nav-icon {
    width: 18px;
    height: 18px;
  }
  
  .nav-text {
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .bottom-navigation {
    height: 55px;
  }
  
  .nav-container {
    gap: 20px;
  }
  
  .nav-button {
    min-width: 45px;
  }
}
</style>
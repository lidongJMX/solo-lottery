<template>
  <div class="home-container">
    <!-- 背景图层 -->
    <div class="background-layer"></div>
    
    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <div class="editable-text-container">
        <!-- 可编辑文字区域 -->
        <div 
          v-if="!isEditing"
          @dblclick="startEditing"
          class="display-text"
          :class="{ 'empty-text': !editableText }"
        >
          {{ editableText || '双击此处编辑文字' }}
        </div>
        
        <!-- 编辑模式 -->
        <textarea
          v-if="isEditing"
          v-model="tempText"
          @blur="saveText"
          @keydown.enter.ctrl="saveText"
          @keydown.esc="cancelEdit"
          ref="textEditor"
          class="text-editor"
          placeholder="请输入文字内容..."
          rows="3"
        ></textarea>
        
        <!-- 编辑提示 -->
        <div v-if="isEditing" class="edit-hint">
          按 Ctrl+Enter 保存，按 Esc 取消
        </div>
      </div>
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
  </div>
</template>

<script>
import BottomNavigation from './BottomNavigation.vue'

export default {
  name: 'Home',
  components: {
    BottomNavigation
  },
  data() {
    return {
      editableText: '',
      tempText: '',
      isEditing: false
    }
  },
  mounted() {
    // 从本地存储加载文字内容
    this.loadText()
  },
  methods: {
    startEditing() {
      this.isEditing = true
      this.tempText = this.editableText
      this.$nextTick(() => {
        if (this.$refs.textEditor) {
          this.$refs.textEditor.focus()
          this.$refs.textEditor.select()
        }
      })
    },
    
    saveText() {
      this.editableText = this.tempText.trim()
      this.isEditing = false
      // 保存到本地存储
      localStorage.setItem('homePageText', this.editableText)
    },
    
    cancelEdit() {
      this.isEditing = false
      this.tempText = this.editableText
    },
    
    loadText() {
      // 从本地存储加载文字
      const savedText = localStorage.getItem('homePageText')
      if (savedText) {
        this.editableText = savedText
      }
    }
  }
}
</script>

<style scoped>
.home-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../assets/background/a.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 1;
}

/* 可以替换为实际的背景图片 */
.background-layer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><radialGradient id="a" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23ffffff" stop-opacity="0.1"/><stop offset="100%" stop-color="%23ffffff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(%23a)"/><circle cx="200" cy="200" r="3" fill="%23ffffff" opacity="0.3"/><circle cx="800" cy="300" r="2" fill="%23ffffff" opacity="0.4"/><circle cx="400" cy="700" r="4" fill="%23ffffff" opacity="0.2"/><circle cx="700" cy="800" r="2" fill="%23ffffff" opacity="0.5"/><circle cx="100" cy="600" r="3" fill="%23ffffff" opacity="0.3"/></svg>');
  opacity: 0.6;
}

.content-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.editable-text-container {
  position: relative;
  max-width: 800px;
  width: 90%;
  text-align: center;
}

.display-text {
  font-size: 35px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  padding: 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  line-height: 1.4;
  word-wrap: break-word;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.display-text:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.display-text.empty-text {
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  font-weight: 400;
}

.text-editor {
  font-size: 35px;
  font-weight: 600;
  color: #333;
  background-color: rgba(255, 255, 255, 0.95);
  border: 3px solid #667eea;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  resize: vertical;
  min-height: 120px;
  line-height: 1.4;
  outline: none;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.text-editor:focus {
  border-color: #764ba2;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(118, 75, 162, 0.2);
}

.edit-hint {
  margin-top: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .display-text,
  .text-editor {
    font-size: 28px;
  }
  
  .editable-text-container {
    width: 95%;
  }
  
  .display-text,
  .text-editor {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .display-text,
  .text-editor {
    font-size: 24px;
  }
}
</style>
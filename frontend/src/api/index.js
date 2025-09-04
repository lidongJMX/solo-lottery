import axios from 'axios'
import { ElMessage } from 'element-plus'


// 根据环境动态设置 baseURL
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080/api'
    }
  }
  // 生产环境使用相对路径
  return '/api'
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里添加token等认证信息
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器（添加重试机制）
api.interceptors.response.use(
  response => {
    return response.data
  },
  async error => {
    const config = error.config;

    // 如果是网络错误且未达到重试上限，进行重试
    if (!config.__retryCount) {
      config.__retryCount = 0;
    }

    if (config.__retryCount < 2 &&
      (error.code === 'ECONNABORTED' ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error'))) {
      config.__retryCount += 1;

      console.log(`网络请求重试 ${config.__retryCount}/2: ${config.url}`);

      // 延迟重试，避免立即重试
      await new Promise(resolve => setTimeout(resolve, 1000 * config.__retryCount));

      return api(config);
    }

    // 显示错误信息
    if (error.response) {
      const message = error.response.data?.error || '请求失败'
      ElMessage.error(message)
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络状态')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

// 参与者相关API
export const participantAPI = {
  // 获取所有参与者
  getAll() {
    return api.get('/participants')
  },

  // 获取可参与抽奖的人员
  getAvailable() {
    return api.get('/participants/available')
  },

  // 获取参与者姓名列表
  getNames() {
    return api.get('/participants/names')
  },

  // 添加参与者
  create(data) {
    return api.post('/participants', data)
  },

  // 更新参与者
  update(id, data) {
    return api.put(`/participants/${id}`, data)
  },

  // 删除参与者
  delete(id) {
    return api.delete(`/participants/${id}`)
  },

  // 批量导入参与者
  import(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/participants/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 批量清空所有参与者
  clearAll(force = false) {
    return api.delete('/participants/clear-all', {
      data: { force }
    })
  }
}

// 奖项相关API
export const awardAPI = {
  // 获取所有奖项
  getAll() {
    return api.get('/awards')
  },

  // 获取奖项配置
  getConfig() {
    return api.get('/awards/config')
  },

  // 获取单个奖项
  getById(id) {
    return api.get(`/awards/${id}`)
  },

  // 添加奖项
  create(data) {
    return api.post('/awards', data)
  },

  // 更新奖项
  update(id, data) {
    return api.put(`/awards/${id}`, data)
  },

  // 删除奖项
  delete(id) {
    return api.delete(`/awards/${id}`)
  }
}

// 抽奖相关API
export const lotteryAPI = {
  // 执行抽奖
  draw(data) {
    return api.post('/lottery/draw', data)
  },

  // 获取中奖记录
  getWinners() {
    return api.get('/lottery/winners')
  },

  // 获取特定奖项的中奖记录
  getWinnersByAward(awardId) {
    return api.get(`/lottery/winners/${awardId}`)
  },

  // 删除中奖记录
  deleteWinner(winnerId) {
    return api.delete(`/lottery/winners/${winnerId}`)
  },

  // 获取统计数据
  getStatistics() {
    return api.get('/lottery/statistics')
  },

  // 重置抽奖
  reset() {
    return api.post('/lottery/reset')
  },
  // 开始新轮次
  nextRound() {
    return api.post('/lottery/next-round')
  },

  // 获取抽奖状态
  getStatus() {
    return api.get('/lottery/status')
  }
}

export default api
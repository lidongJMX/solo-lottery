import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
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

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    const message = error.response?.data?.error || '请求失败'
    ElMessage.error(message)
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
  
  // 获取抽奖统计
  getStatistics() {
    return api.get('/lottery/statistics')
  },
  
  // 重置抽奖
  reset() {
    return api.post('/lottery/reset')
  }
}

export default api
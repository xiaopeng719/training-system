import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// 请求拦截器 - 自动添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 课件相关API
export const courseApi = {
  getAll: (departmentId) => api.get('/courses', { params: { department_id: departmentId } }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (formData) => api.post('/courses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/courses/${id}`)
};

// 考题相关API
export const questionApi = {
  getAll: (courseId) => api.get('/questions', { params: { course_id: courseId } }),
  create: (data) => api.post('/questions', data),
  batchCreate: (data) => api.post('/questions/batch', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`)
};

// 部门相关API
export const departmentApi = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

// 培训任务相关API
export const trainingApi = {
  getAll: (employeeId) => api.get('/trainings', { params: employeeId ? { employee_id: employeeId } : {} }),
  getById: (id) => api.get(`/trainings/${id}`),
  create: (data) => api.post('/trainings', data),
  delete: (id) => api.delete(`/trainings/${id}`)
};

// 培训进度相关API
export const progressApi = {
  submit: (data) => api.post('/progress', data),
  getByTraining: (trainingId) => api.get(`/progress/${trainingId}`),
  getAll: () => api.get('/progress')
};

// 统计API
export const statsApi = {
  get: () => api.get('/stats')
};

// 员工相关API
export const employeeApi = {
  getAll: (departmentId) => api.get('/employees', { params: { department_id: departmentId } }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`)
};

// 用户管理API
export const userApi = {
  getAll: () => api.get('/users'),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// 导出API
export const exportApi = {
  trainingReport: (trainingId) => api.get(`/export/training/${trainingId}`, { responseType: 'blob' })
};

// 最近完成记录API
export const recentApi = {
  getCompletions: () => api.get('/recent-completions')
};

export default api;

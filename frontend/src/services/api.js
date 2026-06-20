import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
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
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`)
};

// 部门相关API
export const departmentApi = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data)
};

// 培训任务相关API
export const trainingApi = {
  getAll: () => api.get('/trainings'),
  getById: (id) => api.get(`/trainings/${id}`),
  create: (data) => api.post('/trainings', data),
  delete: (id) => api.delete(`/trainings/${id}`)
};

// 培训进度相关API
export const progressApi = {
  submit: (data) => api.post('/progress', data),
  getByTraining: (trainingId) => api.get(`/progress/${trainingId}`)
};

// 统计API
export const statsApi = {
  get: () => api.get('/stats')
};

export default api;

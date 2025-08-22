import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'
  ),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp for debugging in development
    if (process.env.NODE_ENV === 'development') {
      config.metadata = { startTime: new Date() };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    return response;
  },
  (error) => {
    // Enhanced error handling
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status;

    // Create standardized error object
    const apiError = {
      message: errorMessage,
      status,
      data: error.response?.data,
      config: error.config,
    };

    // Handle specific error cases
    if (status === 401) {
      apiError.type = 'UNAUTHORIZED';
    } else if (status === 403) {
      apiError.type = 'FORBIDDEN';
    } else if (status === 404) {
      apiError.type = 'NOT_FOUND';
    } else if (status === 422) {
      apiError.type = 'VALIDATION_ERROR';
    } else if (status >= 500) {
      apiError.type = 'SERVER_ERROR';
    } else if (!status) {
      apiError.type = 'NETWORK_ERROR';
    }

    return Promise.reject(apiError);
  }
);

// Sessions API
export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  getByStatus: (status) => api.get(`/sessions/status/${status}`),
  getByPriority: (priority) => api.get(`/sessions/priority/${priority}`),
};

// Hardware API
export const hardwareAPI = {
  // Platforms
  getPlatforms: () => api.get('/hardware/platforms'),
  createPlatform: (data) => api.post('/hardware/platforms', data),
  updatePlatform: (id, data) => api.put(`/hardware/platforms/${id}`, data),
  deletePlatform: (id) => api.delete(`/hardware/platforms/${id}`),

  // Debuggers
  getDebuggers: () => api.get('/hardware/debuggers'),
  createDebugger: (data) => api.post('/hardware/debuggers', data),
  updateDebugger: (id, data) => api.put(`/hardware/debuggers/${id}`, data),
  deleteDebugger: (id) => api.delete(`/hardware/debuggers/${id}`),

  // Requirements
  getRequirements: () => api.get('/hardware/requirements'),

  // Combinations
  getCombinations: () => api.get('/hardware/combinations'),
  createCombination: (data) => api.post('/hardware/combinations', data),
  updateCombination: (id, data) => api.put(`/hardware/combinations/${id}`, data),
  deleteCombination: (id) => api.delete(`/hardware/combinations/${id}`),
  cloneCombination: (id) => api.post(`/hardware/combinations/${id}/clone`),
  updateCombinationAvailability: (id, hourlyAvailability) => api.put(`/hardware/combinations/${id}/availability`, { hourlyAvailability }),

  // Inventory
  getInventory: () => api.get('/hardware/inventory'),
  createInventory: (data) => api.post('/hardware/inventory', data),
  updateInventory: (id, data) => api.put(`/hardware/inventory/${id}`, data),
  deleteInventory: (id) => api.delete(`/hardware/inventory/${id}`),

  // Availability (legacy endpoints)
  getAvailability: () => api.get('/hardware/availability'),
  updateAvailability: (id, data) => api.put(`/hardware/availability/${id}`, data),
};

// Machines API
export const machinesAPI = {
  getAll: () => api.get('/machines'),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
  getAvailable: () => api.get('/machines/available'),
};

// Scheduling API
export const schedulingAPI = {
  // Auto scheduling
  autoSchedule: (data) => api.post('/scheduling/auto-schedule', data),
  getAutoScheduleOptions: () => api.get('/scheduling/auto/options'),
  getAnalysis: () => api.get('/scheduling/analysis'),

  getQueue: () => api.get('/scheduling/queue'),
  getStrategies: () => api.get('/scheduling/strategies'),

  // Manual scheduling
  manualSchedule: (data) => api.post('/scheduling/manual', data),
  updateSchedule: (id, data) => api.put(`/scheduling/${id}`, data),
  deleteSchedule: (id) => api.delete(`/scheduling/${id}`),

  // Schedule queries
  getSchedule: (params) => api.get('/scheduling/timeline', { params }),
  getScheduleByDate: (date) => api.get(`/scheduling/date/${date}`),
  getScheduleByMachine: (machineId) => api.get(`/scheduling/machine/${machineId}`),

  // Conflict detection
  checkConflicts: (params) => api.get('/scheduling/conflicts', { params }),
  resolveConflicts: (data) => api.post('/scheduling/conflicts/resolve', data),

  // Schedule management
  clearSchedule: (params) => api.delete('/scheduling/clear', { params }),
  copySchedule: (data) => api.post('/scheduling/copy', data),

  // Analytics
  getUtilization: (params) => api.get('/scheduling/utilization', { params }),
  getStatistics: (params) => api.get('/scheduling/statistics', { params }),
};

// CSV API
export const csvAPI = {
  // File upload
  upload: (formData, onProgress) => api.post('/csv/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress,
  }),

  // Validation
  validate: (formData) => api.post('/csv/validate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Templates
  downloadTemplate: (type = 'sessions') => api.get(`/csv/template/${type}`, {
    responseType: 'blob',
  }),
  getTemplateInfo: () => api.get('/csv/template/info'),

  // Export
  export: (data) => api.post('/csv/export', data, {
    responseType: 'blob',
  }),
  exportSessions: (filters) => api.post('/csv/export/sessions', filters, {
    responseType: 'blob',
  }),
  exportSchedule: (params) => api.post('/csv/export/schedule', params, {
    responseType: 'blob',
  }),

  // History and tracking
  getHistory: () => api.get('/csv/history'),
  getImportStatus: (id) => api.get(`/csv/import/${id}/status`),
  cancelImport: (id) => api.delete(`/csv/import/${id}`),
};

// Utility functions
export const apiUtils = {
  // Error handling
  isNetworkError: (error) => error.type === 'NETWORK_ERROR',
  isServerError: (error) => error.type === 'SERVER_ERROR',
  isValidationError: (error) => error.type === 'VALIDATION_ERROR',
  isUnauthorized: (error) => error.type === 'UNAUTHORIZED',

  // Response helpers
  extractData: (response) => response.data,
  extractMessage: (error) => error.message || 'An unexpected error occurred',

  // File download helper
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Progress tracking
  createProgressHandler: (onProgress) => (progressEvent) => {
    if (progressEvent.lengthComputable && onProgress) {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    }
  },
};

export default api;

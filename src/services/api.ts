import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config: { headers: { Authorization: string; }; }) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};

// Email/Subscription API
export const emailAPI = {
  subscribe: async (sheetIds: string[], dailyProblems: number, preferredTime: string) => {
    const response = await apiClient.post('/email/subscribe', {
      sheetIds,
      dailyProblems,
      preferredTime
    });
    return response.data;
  },
  
  unsubscribe: async () => {
    const response = await apiClient.post('/email/unsubscribe');
    return response.data;
  },
  
  updateSubscription: async (emailNotifications: boolean) => {
    const response = await apiClient.put('/email/subscription', {
      emailNotifications
    });
    return response.data;
  },
  
  updatePreferences: async (preferences: { 
    dailyProblems?: number; 
    preferredTime?: string; 
    selectedSheets?: string[] 
  }) => {
    const response = await apiClient.put('/email/preferences', preferences);
    return response.data;
  },
  
  getSubscriptionStatus: async () => {
    const response = await apiClient.get('/email/subscription-status');
    return response.data;
  },
  
  getEmailPreferences: async () => {
    const response = await apiClient.get('/email/preferences');
    return response.data;
  },

  clearProblemHistory: async () => {
    const response = await apiClient.post('/email/clear-history');
    return response.data;
  },

  getSentStats: async () => {
    const response = await apiClient.get('/email/sent-stats');
    return response.data;
  }
};

// Sheets API
export const sheetsAPI = {
  getAllSheets: async () => {
    const response = await apiClient.get('/sheets');
    return response.data;
  },
  
  getSheetById: async (id: string) => {
    const response = await apiClient.get(`/sheets/${id}`);
    return response.data;
  }
};

// Problems API
export const problemsAPI = {
  getProblems: async (sheetId?: string) => {
    const url = sheetId ? `/problems?sheet=${sheetId}` : '/problems';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Mark problem as completed/uncompleted
  toggleComplete: async (problemId: string, completed: boolean, sheetId?: string) => {
    const response = await apiClient.post(`/problems/${problemId}/complete`, {
      completed,
      sheetId
    });
    return response.data;
  },

  // Get completion status for multiple problems
  getCompletionStatus: async (problemIds: string[]) => {
    const response = await apiClient.post('/problems/completion-status', {
      problemIds
    });
    return response.data;
  },

  // Get user's overall stats
  getUserStats: async () => {
    const response = await apiClient.get('/problems/my-stats');
    return response.data;
  }
};

// Progress API
export const progressAPI = {
  updateProgress: async (problemId: string, sheetId: string, status: 'solved' | 'in_progress' | 'bookmarked' | 'not_started') => {
    const response = await apiClient.post('/progress/problem', {
      problemId,
      sheetId,
      status
    });
    return response.data;
  },

  getSheetProgress: async (sheetId: string) => {
    const response = await apiClient.get(`/progress/sheet/${sheetId}`);
    return response.data;
  },

  getOverview: async () => {
    const response = await apiClient.get('/progress/overview');
    return response.data;
  },

  getSheetStats: async (sheetId: string) => {
    const response = await apiClient.get(`/progress/sheet/${sheetId}/stats`);
    return response.data;
  },

  bulkUpdate: async (updates: Array<{problemId: string, sheetId: string, status: string}>) => {
    const response = await apiClient.post('/progress/bulk', { updates });
    return response.data;
  }
};

// Code execution API
export const codeAPI = {
  executeCode: async (code: string, language: string, problemId?: string) => {
    const response = await apiClient.post('/code/execute', {
      code,
      language,
      problemId
    });
    return response.data;
  }
};

export default apiClient;

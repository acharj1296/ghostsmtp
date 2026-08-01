import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios request interceptor to attach JWT Token and Workspace context dynamically
apiClient.interceptors.request.use(
  (config) => {
    // In future, dynamically fetch JWT from Firebase SDK
    const mockToken = localStorage.getItem('token');
    if (mockToken) {
      config.headers.Authorization = `Bearer ${mockToken}`;
    }

    const activeWorkspaceId = localStorage.getItem('activeWorkspaceId');
    if (activeWorkspaceId) {
      config.headers['X-Workspace-ID'] = activeWorkspaceId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;

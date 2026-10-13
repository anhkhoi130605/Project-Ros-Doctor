import { apiClient } from './apiClient/apiClient';

export const profileService = {
  getMyProfile: () => apiClient.get('/api/profile/me'),
  updateProfile: (data) => apiClient.put('/api/profile/me', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/profile/me/avatar', formData);
  },
};

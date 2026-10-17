import { apiClient } from './apiClient';

/**
 * Lấy danh sách thông báo thực tế từ Backend dựa trên vai trò của người dùng hiện tại
 * @param {number} take Số lượng thông báo cần lấy (mặc định 50)
 * @returns {Promise<Array>} Danh sách thông báo
 */
export async function getNotificationsApi(take = 50) {
  return apiClient.get(`/api/notifications?take=${take}`, { noCache: true });
}

/**
 * Đánh dấu một thông báo là đã đọc
 * @param {string} id Mã thông báo
 */
export async function markNotificationReadApi(id) {
  return apiClient.put(`/api/notifications/${id}/read`);
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllNotificationsReadApi() {
  return apiClient.put('/api/notifications/read-all');
}

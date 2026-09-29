import { apiClient } from './apiClient';

export async function getBagsApi() {
  return apiClient.get('/api/bags');
}

export async function getBagByIdApi(id) {
  return apiClient.get(`/api/bags/${id}`);
}

export async function createBagApi(bagData) {
  return apiClient.post('/api/bags', bagData);
}

export async function deleteBagApi(id) {
  return apiClient.delete(`/api/bags/${id}`);
}

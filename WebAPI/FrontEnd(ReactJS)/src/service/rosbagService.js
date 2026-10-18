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

export async function inspectBagApi(payload) {
  return apiClient.post('/api/bags/inspect', payload);
}

export async function getSampleBagsApi() {
  return apiClient.get('/api/bags/samples');
}

export async function uploadAndInspectBagApi(file, yamlFile = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (yamlFile) {
    formData.append('yamlFile', yamlFile);
  }
  return apiClient.post('/api/bags/upload-and-inspect', formData, { handleErrorLocally: true });
}

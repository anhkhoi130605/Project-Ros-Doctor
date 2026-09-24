import { apiClient } from '../../../service/apiClient/apiClient';

export async function fetchProductsApi(params = {}) {
  return apiClient.get('/api/products');
}

export async function fetchProductByIdApi(id) {
  return apiClient.get(`/api/products/${id}`);
}

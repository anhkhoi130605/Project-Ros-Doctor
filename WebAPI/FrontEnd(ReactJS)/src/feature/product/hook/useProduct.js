import { useState, useEffect } from 'react';
import { fetchProductsApi } from '../api/productApi';

export function useProduct() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProductsApi();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return { products, loading, error };
}

import api from '../api/api';
import { normalizeProduct } from './catalog';
export async function getProduct(slug) {
  try { const result = await api.get(`/products/${encodeURIComponent(slug)}`); return { ...result, product: normalizeProduct(result.product) }; }
  catch (originalError) {
    // Older backend schemas lack review columns. The catalog remains a reliable product source.
    let page = 1;
    while (true) {
      const result = await api.get('/products', { params: { page, limit: 100 } });
      const product = result.products.find(p => p.slug === slug);
      if (product) return { product: normalizeProduct(product), reviews: [], reviewsUnavailable: true };
      if (page >= Number(result.pages || 1)) throw originalError;
      page++;
    }
  }
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useCartStore = create(persist((set, get) => ({
  items: [],
  addItem: product => {
    if (!product.purchasable || product.stock < 1) return false;
    const existing = get().items.find(i => i.id === product.id);
    if (existing && existing.quantity >= product.stock) return false;
    set({ items: existing ? get().items.map(i => i.id === product.id ? { ...product, quantity: i.quantity + 1 } : i) : [...get().items, { ...product, quantity: 1 }] });
    return true;
  },
  removeItem: id => set({ items: get().items.filter(i => i.id !== id) }),
  updateQty: (id, value) => set({ items: get().items.map(i => i.id === id ? { ...i, quantity: Math.max(1, Math.min(i.stock || 1, Math.floor(Number(value) || 1))) } : i) }),
  replaceItems: items => set({ items }),
  clearCart: () => set({ items: [] }),
}), { name: 'pl-cart', version: 1, migrate: () => ({ items: [] }), partialize: state => ({ items: state.items }) }));

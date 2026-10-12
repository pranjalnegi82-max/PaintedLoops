import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../store/useCartStore';
import { money } from '../lib/catalog';
import ProductImage from './ProductImage';
export default function ProductCard({ product }) {
  const add = useCartStore(s => s.addItem);
  const quantity = useCartStore(s => s.items.find(i => i.id === product.id)?.quantity || 0);
  const [added, setAdded] = useState(false);
  const unavailable = !product.purchasable || product.stock < 1;
  const maxed = quantity >= product.stock;
  return <article className="product-card">
    <Link className="product-photo" to={`/product/${product.slug}`}><ProductImage product={product} />{unavailable && <span className="badge">Sold out</span>}</Link>
    <div className="product-info"><span className="eyebrow">{product.category_name || 'Handcrafted'}</span>
      <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
      <div className="price-row"><span className="price">{product.purchasable ? money(product.price) : 'Unavailable'} {product.old_price && <del>{money(product.old_price)}</del>}</span>
        <button className="icon-button add-button" disabled={unavailable || maxed} aria-label={maxed ? 'Stock limit reached' : `Add ${product.name} to bag`} onClick={() => { if (add(product)) setAdded(true); }}>{added ? <Check size={18} /> : <Plus size={18} />}</button>
      </div><span className="card-status" aria-live="polite">{added ? 'Added to your bag' : maxed && !unavailable ? 'Stock limit reached' : ''}</span>
    </div>
  </article>;
}

import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { getProduct } from '../lib/products';
import useResource from '../hooks/useResource';
import { money, SHIPPING } from '../lib/catalog';
import ProductImage from '../components/ProductImage';
import { ErrorMessage, Loading } from '../components/Feedback';
export default function Cart() {
 const { items, updateQty, removeItem, replaceItems } = useCartStore(); const navigate = useNavigate();
 const keys = items.map(i => i.slug).join('|');
 const r = useResource(async () => Promise.all(items.map(async item => {
   try { return (await getProduct(item.slug)).product; } catch { return { id: item.id, unavailable: true }; }
 })), [keys]);
 const fresh = items.map(item => ({ ...item, ...r.data?.find(p => p.id === item.id), quantity: item.quantity }));
 const blocked = fresh.some(i => i.unavailable || !i.purchasable || i.quantity > i.stock);
 const changed = fresh.some(i => i.price !== items.find(p => p.id === i.id)?.price);
 const total = fresh.reduce((sum,i) => sum + i.price * i.quantity, 0);
 if (!items.length) return <main id="main" className="container page empty"><ShoppingBag size={44}/><h1>Your bag is waiting for a little joy</h1><p>Let’s find something you’ll love keeping close.</p><Link className="button" to="/shop">Explore the collection <ArrowRight size={18}/></Link></main>;
 return <main id="main" className="container page"><div className="breadcrumbs"><Link to="/shop">Shop</Link> / Your bag</div><h1>Your lovely little finds</h1><div className="cart-layout"><section>{r.loading && <Loading/>}{r.error && <ErrorMessage message={r.error} retry={r.retry}/ >}{changed && <p className="notice">Some prices have changed. The latest prices are shown below.</p>}{fresh.map(i => <article className="cart-item" key={i.id}><Link to={`/product/${i.slug}`}><ProductImage product={i}/></Link><div><h3><Link to={`/product/${i.slug}`}>{i.name}</Link></h3><p>{money(i.price)} each</p>{(i.unavailable || !i.purchasable || i.quantity > i.stock) && <p className="error-text">{i.unavailable ? 'Unable to verify this product. Retry or remove it.' : `${i.stock} available. Please reduce the quantity or remove this item.`}</p>}<div className="quantity"><button aria-label={`Decrease quantity of ${i.name}`} disabled={i.quantity <= 1} onClick={() => updateQty(i.id, i.quantity - 1)}><Minus size={14}/></button><span aria-label="Quantity">{i.quantity}</span><button aria-label={`Increase quantity of ${i.name}`} disabled={i.quantity >= i.stock || i.unavailable} onClick={() => { replaceItems(fresh); updateQty(i.id, i.quantity + 1); }}><Plus size={14}/></button></div></div><div className="item-end"><strong>{money(i.price * i.quantity)}</strong><button className="icon-button" aria-label={`Remove ${i.name}`} onClick={() => removeItem(i.id)}><Trash2 size={18}/></button></div></article>)}{blocked && <button className="text-button" onClick={r.retry}>Refresh availability</button>}<Link className="text-link" to="/shop">← Keep exploring</Link></section><aside className="summary"><span className="eyebrow">A little happiness, on its way</span><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>{money(total)}</dd></div><div><dt>Shipping</dt><dd>{money(SHIPPING)}</dd></div><div className="total"><dt>Total</dt><dd>{money(total + SHIPPING)}</dd></div></dl><button className="button wide" disabled={r.loading || !!r.error || blocked} onClick={() => { replaceItems(fresh); navigate('/checkout'); }}>Continue to checkout <ArrowRight size={18}/></button><p className="small muted">Cash on delivery available. Final availability is checked at checkout.</p></aside></div></main>;
}

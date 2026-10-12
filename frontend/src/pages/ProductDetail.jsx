import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Truck, Heart } from 'lucide-react';
import { useState } from 'react';
import useResource from '../hooks/useResource';
import { getProduct } from '../lib/products';
import { money, SHIPPING } from '../lib/catalog';
import { useCartStore } from '../store/useCartStore';
import ProductImage from '../components/ProductImage';
import { ErrorMessage, Loading } from '../components/Feedback';
export default function ProductDetail() {
 const { slug } = useParams(); const r = useResource(() => getProduct(slug), [slug]);
 const add = useCartStore(s => s.addItem); const items = useCartStore(s => s.items); const [message, setMessage] = useState('');
 if (r.loading) return <main id="main" className="container page"><Loading/></main>;
 if (r.error) return <main id="main" className="container page"><ErrorMessage message={r.error} retry={r.retry}/><Link to="/shop">Back to shop</Link></main>;
 const p = r.data.product; const qty = items.find(i => i.id === p.id)?.quantity || 0;
 return <main id="main" className="container page"><div className="breadcrumbs"><Link to="/shop">Shop</Link> / {p.name}</div><section className="product-detail"><div className="detail-photo"><ProductImage product={p} eager/></div><div className="detail-copy"><span className="eyebrow">{p.category_name}</span><h1>{p.name}</h1><p className="detail-price">{p.purchasable ? money(p.price) : 'Unavailable'} {p.old_price && <del>{money(p.old_price)}</del>}</p><p className="description">{p.description || 'A little handcrafted joy from PaintedLoops.'}</p><p className="stock">{p.stock ? `${p.stock} available` : 'Currently out of stock'}</p><button className="button wide" disabled={!p.purchasable || qty >= p.stock} onClick={() => setMessage(add(p) ? 'Added to your bag.' : 'You have reached the available stock.') }><ShoppingBag size={19}/> {qty >= p.stock && p.stock > 0 ? 'All available stock is in your bag' : 'Add to bag'}</button><p className="success" aria-live="polite">{message && <>{message} <Link to="/cart">View bag →</Link></>}</p><div className="detail-perks"><p><Truck size={18}/> {money(SHIPPING)} shipping per order</p><p><Heart size={18}/> Handmade details make every piece individual</p></div></div></section><section className="section"><h2>Customer reviews</h2>{r.data.reviewsUnavailable ? <p>Reviews are temporarily unavailable.</p> : r.data.reviews?.length ? r.data.reviews.map(review => <article className="review" key={review.id}><strong>{review.first_name} · {review.rating}/5</strong><p>{review.comment}</p></article>) : <p>No reviews yet.</p>}</section></main>;
}

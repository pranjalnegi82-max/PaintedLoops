import { pendingKey } from '../lib/checkout';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useCartStore } from '../store/useCartStore';
import { getProduct } from '../lib/products';
import { money, SHIPPING } from '../lib/catalog';
import useResource from '../hooks/useResource';
import { ErrorMessage, Loading } from '../components/Feedback';
import AddressForm from '../components/AddressForm';
export default function Checkout() {
 const { items, clearCart, replaceItems } = useCartStore(); const navigate = useNavigate();
 const r = useResource(() => api.get('/addresses')); const [address, setAddress] = useState('');
 const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
 const [pending, setPending] = useState(() => sessionStorage.getItem(pendingKey()));
 const selected = address || String(r.data?.addresses?.[0]?.id || '');
 const total = items.reduce((sum,i) => sum + i.price * i.quantity, 0) + SHIPPING;
 async function submit() {
   if (lock.current) return;
   lock.current = true; setBusy(true); setError('');
   try {
     if (pending === 'uncertain') throw new Error('The previous request may have reached the shop. Check My orders before starting another order.');
     let id = pending;
     if (!id) {
       if (!r.data?.addresses.some(a => String(a.id) === selected)) throw new Error('Please save and select a delivery address.');
       const fresh = await Promise.all(items.map(async i => ({ ...(await getProduct(i.slug)).product, quantity: i.quantity })));
       const invalid = fresh.some(p => !p.purchasable || p.quantity < 1 || !Number.isInteger(p.quantity) || p.quantity > p.stock);
       const changed = fresh.some(p => p.price !== items.find(i => i.id === p.id).price);
       replaceItems(fresh);
       if (invalid) throw new Error('Availability has changed. Return to your bag to adjust the items.');
       if (changed) throw new Error('Prices have changed. Please review the updated total, then place your order again.');
       sessionStorage.setItem(pendingKey(), 'uncertain'); setPending('uncertain');
       const result = await api.post('/orders', { address_id: Number(selected), payment_method: 'cod', items: fresh.map(i => ({ product_id: i.id, quantity: i.quantity })) });
       id = String(result.order_id); sessionStorage.setItem(pendingKey(), id); setPending(id);
     }
     await api.post('/payment/cod-confirm', { order_id: Number(id) });
     sessionStorage.removeItem(pendingKey()); clearCart(); navigate(`/orders/${id}`, { replace: true, state: { placed: true } });
   } catch (e) { setError(e.message); } finally { lock.current = false; setBusy(false); }
 }
 if (!items.length && !pending) return <main id="main" className="container page empty"><h1>Your bag is empty</h1><Link className="button" to="/shop">Find something lovely</Link></main>;
 return <main id="main" className="container page"><div className="breadcrumbs"><Link to="/cart">Your bag</Link> / Checkout</div><h1>Almost yours.</h1><div className="cart-layout"><section><h2>1. Where should your order go?</h2>{r.loading ? <Loading/> : r.error ? <ErrorMessage message={r.error} retry={r.retry}/> : <div className="address-list">{r.data.addresses.map(a => <label className={`address-option ${selected === String(a.id) ? 'selected' : ''}`} key={a.id}><input type="radio" name="address" disabled={!!pending || busy} value={a.id} checked={selected === String(a.id)} onChange={e => setAddress(e.target.value)}/><span><strong>{a.full_name}</strong><br/>{a.address_line1}, {a.address_line2 && `${a.address_line2}, `}{a.city}, {a.state} — {a.pin_code}<br/>{a.phone}</span></label>)}</div>}{!pending && <details open={!r.data?.addresses?.length}><summary>Add a new address</summary><AddressForm onSaved={r.retry}/></details>}<h2 className="payment-heading">2. How would you like to pay?</h2><div className="notice"><strong>Cash on delivery</strong><p>Pay {money(total)} when your order arrives.</p><p className="small muted">Online payment is currently unavailable.</p></div></section><aside className="summary"><h2>Your order</h2>{items.map(i => <div className="checkout-line" key={i.id}><span>{i.name} × {i.quantity}</span><strong>{money(i.price * i.quantity)}</strong></div>)}<dl><div><dt>Shipping</dt><dd>{money(SHIPPING)}</dd></div><div className="total"><dt>Total</dt><dd>{money(total)}</dd></div></dl>{error && <ErrorMessage message={error}/ >}{pending === 'uncertain' ? <div className="notice"><p>Your order status needs checking before you retry.</p><Link className="text-link" to="/orders">Check My orders →</Link></div> : <button className="button wide" disabled={busy || r.loading || !!r.error || (!selected && !pending)} onClick={submit}>{busy ? 'Placing your order…' : pending ? 'Retry order confirmation' : 'Place COD order'}</button>}<Link className="text-link" to="/cart">Back to bag</Link></aside></div></main>;
}

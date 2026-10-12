import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, UserRound, Menu, X, Search } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../store/useCartStore';
export default function Navbar() {
  const count = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);
  return <><div className="announcement">Little things. Made with a whole lot of love. <span>Handcrafted in Dehradun</span></div>
    <header className="header"><nav className="nav container" aria-label="Main navigation">
      <Link to="/" className="wordmark" onClick={() => setOpen(false)}>painted<span>loops</span><i>✳</i></Link>
      <div className="desktop-nav"><NavLink to="/shop">Shop all</NavLink><NavLink to="/shop/crochet-flowers">Crochet flowers</NavLink><NavLink to="/shop/keychains">Little keepsakes</NavLink></div>
      <div className="nav-actions"><Link className="icon-button" to="/shop" aria-label="Search products"><Search size={21} /></Link><Link className="icon-button" to="/account" aria-label="Your account"><UserRound size={21} /></Link><Link className="icon-button cart-icon" to="/cart" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={21} />{count > 0 && <b>{count}</b>}</Link><button className="icon-button mobile-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    </nav>{open && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{[['/shop','Shop all'],['/shop/crochet-flowers','Crochet flowers'],['/shop/keychains','Keychains'],['/orders','My orders']].map(([url,name]) => <Link key={url} to={url} onClick={() => setOpen(false)}>{name}</Link>)}</nav>}</header></>;
}

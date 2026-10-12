import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import api from '../api/api';
import useResource from '../hooks/useResource';
import ProductCard from '../components/ProductCard';
import { ErrorMessage, Loading } from '../components/Feedback';
import { categories, normalizeProduct } from '../lib/catalog';
export default function Shop() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, parseInt(params.get('page')) || 1);
  const resource = useResource(() => api.get('/products', { params: { category: categorySlug, search, sort, page, limit: 12 } }), [categorySlug, search, sort, page]);
  const title = categories.find(c => c[0] === categorySlug)?.[1] || 'The little joys collection';
  const update = values => setParams({ search, sort, page: '1', ...values });
  return <main id="main" className="container page"><div className="breadcrumbs"><Link to="/">Home</Link> / Shop</div><div className="page-heading"><span className="eyebrow">Thoughtfully made. Happily kept.</span><h1>{title}</h1><p>Find a little something that feels like you.</p></div>
    <div className="shop-tools"><form className="search-field" onSubmit={e => { e.preventDefault(); update({ search: new FormData(e.currentTarget).get('search').trim() }); }}><Search size={19}/><input key={search} name="search" aria-label="Search products" placeholder="Search for your next favourite…" defaultValue={search}/><button type="submit" className="icon-button" aria-label="Submit search"><ArrowRight size={18}/></button></form><label className="sort-label">Sort by <select value={sort} onChange={e => update({ sort: e.target.value })}><option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label></div>
    <div className="category-tabs" aria-label="Product categories"><Link className={!categorySlug ? 'selected' : ''} to="/shop">All things lovely</Link>{categories.map(([slug,name]) => <Link key={slug} className={slug === categorySlug ? 'selected' : ''} to={`/shop/${slug}`}>{name}</Link>)}</div>
    {resource.loading ? <Loading/> : resource.error ? <ErrorMessage message={resource.error} retry={resource.retry}/> : <><p className="results-count">{resource.data.total} products{search && <> matching “{search}”</>}</p>{resource.data.products.length ? <div className="product-grid">{resource.data.products.map(p => <ProductCard key={p.id} product={normalizeProduct(p)}/>)}</div> : <div className="empty"><h2>No little treasures here yet</h2><p>Try a different search or explore all collections.</p><Link className="button" to="/shop">Browse all products</Link></div>}<div className="pagination">{page > 1 && <button className="button secondary" onClick={() => update({ page: String(page - 1) })}>Previous</button>}{resource.data.pages > 0 && <span>Page {page} of {resource.data.pages}</span>}{page < resource.data.pages && <button className="button secondary" onClick={() => update({ page: String(page + 1) })}>Next</button>}</div></>}
  </main>;
}

import { useState } from 'react';
import { productImages } from '../lib/catalog';
function Image({ product, className = '', eager = false }) {
  const sources = productImages(product);
  const [index, setIndex] = useState(0);
  return <img className={className} src={sources[Math.min(index, sources.length - 1)]} alt={product.name} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setIndex(i => Math.min(i + 1, sources.length - 1))} />;
}
export default function ProductImage(props) { return <Image key={`${props.product.id}-${props.product.image_url}`} {...props} />; }

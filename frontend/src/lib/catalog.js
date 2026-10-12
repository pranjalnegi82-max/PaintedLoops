import { API_ORIGIN } from '../api/api';
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
export const SHIPPING = 50; // Current backend shipping rule; keep server and client aligned.
export const categories = [
  ['hair-accessories', 'Hair accessories'], ['crochet-flowers', 'Crochet flowers'],
  ['bags-purses', 'Bags & purses'], ['keychains', 'Keychains'], ['bookmarks', 'Bookmarks'],
  ['amigurumi', 'Amigurumi'], ['aipan-art', 'Aipan art'], ['painted-keychains', 'Painted keychains'],
];
const photos = {
  'spiderman-eye-wooden-keychain': 'kc1.jpg', 'evil-eye-nazar-wooden-keychain': 'kc2.jpg',
  'polar-bear-love-wooden-keychain': 'kc3.jpg', 'three-cats-starry-wooden-keychain': 'kc4.jpg',
  'black-cat-diamond-wooden-keychain': 'kc5.jpg', 'kitty-batman-love-wooden-keychain': 'kc6.jpg',
  'batman-logo-wooden-keychain': 'kc7.jpg', 'colourful-cats-wooden-keychain': 'kc8.jpg',
  'choose-peace-daisy-wooden-keychain': 'kc9.jpg', 'casa-amor-lar-wooden-keychain': 'kc10.jpg',
  'we-bare-bears-wooden-keychain': 'kc11.jpg', 'shinchan-wooden-keychain': 'kc12.jpg',
  'lavender-crochet-bow-clip': 'bow_purple.jpg', 'red-flower-hair-clips-pair': 'flower_red_pin.jpg',
  'white-daisy-hair-pins': 'flower_white_pin.jpg', 'crochet-flower-hair-garland': 'garland_white.jpg',
  'crochet-bun-scrunchie': 'scrunchie.jpg', 'crochet-rose-stems-set-2': 'rose_red.jpg',
  'daisy-flower-sticks-set-2': 'daisy_stick.jpg', 'mixed-flower-bouquet': 'flower_bouquet.jpg',
  'sunflower-daisy-pair': 'sunflower_daisy.jpg', 'beret-with-sunglass-pocket': 'bookmark2.jpg', 'daisy-bookmark-with-stem': 'beret_glasses.jpg',
  'daisy-crochet-keychain': 'daisy_keychain.jpg', 'evil-eye-crochet-keychain': 'evil_eye_keychain.jpg',
  'spider-man-crochet-keychain': 'spiderman_amigurumi.jpg', 'lord-ganesh-aipan-art': 'ganesh_aipan.jpg',
};
export function productImages(product) {
  let gallery = product.images;
  if (typeof gallery === 'string') { try { gallery = JSON.parse(gallery); } catch { gallery = []; } }
  const candidates = [product.image_url, ...(Array.isArray(gallery) ? gallery : [])].filter(v => typeof v === 'string' && v.trim());
  const urls = candidates.flatMap(value => {
    const url = value.trim().replace(/\\/g, '/');
    if (/^https?:\/\//i.test(url)) return [url];
    if (/^\/?uploads\//.test(url)) return [`${API_ORIGIN}/${url.replace(/^\//, '')}`];
    return [];
  });
  if (photos[product.slug]) urls.unshift(`/products/${photos[product.slug]}`);
  return [...new Set(urls), '/product-placeholder.svg'];
}
export function normalizeProduct(p) {
  const price = Number(p.price);
  return { ...p, id: Number(p.id), price, stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
    purchasable: Number.isFinite(price) && price > 0 && p.is_active !== 0 && p.is_active !== false,
    old_price: Number(p.old_price) > price ? Number(p.old_price) : null };
}

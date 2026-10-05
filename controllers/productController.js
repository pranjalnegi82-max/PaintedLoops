const { HttpError, integer, money, pagination } = require('../utils/validation');
const db = require('../config/db');

// GET /api/products  — list with filters
exports.getProducts = async (req, res) => {
  try {
    const category = req.query.category || null;
    const search = req.query.search || null;
    const sort = req.query.sort || null;
    const { page, limit, offset } = pagination(req.query);

    let where = ['p.is_active = 1'];
    let params = [];

    if (category) { where.push('c.slug = ?'); params.push(category); }
    if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const orderMap = { price_asc:'p.price ASC', price_desc:'p.price DESC', rating:'p.rating DESC', newest:'p.created_at DESC' };
    const orderBy = orderMap[sort] || 'p.created_at DESC';

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p JOIN categories c ON p.category_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}`;

    const [products] = await db.execute(sql, params);
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM products p JOIN categories c ON p.category_id=c.id WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), products });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};


// GET /api/products/:slug
exports.getProduct = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p JOIN categories c ON p.category_id=c.id
       WHERE p.slug=? AND p.is_active=1`, [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found.' });

    const [reviews] = await db.execute(
      `SELECT r.*, u.first_name, u.last_name FROM reviews r JOIN users u ON r.user_id=u.id
       WHERE r.product_id=? AND r.is_approved=1 ORDER BY r.created_at DESC LIMIT 10`, [rows[0].id]
    );
    res.json({ success: true, product: rows[0], reviews });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};

// POST /api/products  (admin)
exports.createProduct = async (req, res) => {
  try {
    const { category_id, name, description, price, old_price, stock, badge, image_url } = req.body;
    validateProduct(req.body);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await db.execute(
      'INSERT INTO products (category_id,name,slug,description,price,old_price,stock,badge,image_url) VALUES (?,?,?,?,?,?,?,?,?)',
      [category_id, name, slug, description, price, old_price || null, stock || 0, badge || null, image_url || null]
    );
    res.status(201).json({ success: true, message: 'Product created.', id: result.insertId });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};

// PUT /api/products/:id  (admin)
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, old_price, stock, badge, image_url, is_active, category_id } = req.body;
    validateProduct(req.body);
    await db.execute(
      `UPDATE products SET category_id=?,name=?,description=?,price=?,old_price=?,stock=?,badge=?,image_url=?,is_active=? WHERE id=?`,
      [category_id, name, description, price, old_price||null, stock, badge||null, image_url||null, is_active??1, req.params.id]
    );
    res.json({ success: true, message: 'Product updated.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};

// DELETE /api/products/:id  (admin)
exports.deleteProduct = async (req, res) => {
  try {
    await db.execute('UPDATE products SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Product deactivated.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};

// POST /api/products/:id/review  (protected)
exports.addReview = async (req, res) => {
  try {
    const { rating, comment, photo_url } = req.body;
    const product_id = integer(req.params.id, 'Product ID');
    integer(rating, 'Rating', 1, 5);
    if (comment != null && (typeof comment !== 'string' || comment.length > 5000)) throw new HttpError(400, 'Review comment is too long.');
    if (photo_url) imageUrl(photo_url);
    const [[product]] = await db.execute('SELECT id FROM products WHERE id=? AND is_active=1', [product_id]);
    if (!product) throw new HttpError(404, 'Product not found.');
    await db.execute(
      `INSERT INTO reviews (product_id, user_id, rating, comment, photo_url)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating=?, comment=?, photo_url=?, is_approved=1`,
      [product_id, req.user.id, rating, comment, photo_url || null, rating, comment, photo_url || null]
    );
    // Recalculate product rating
    await db.execute(
      `UPDATE products p SET
        rating=(SELECT AVG(rating) FROM reviews WHERE product_id=? AND is_approved=1),
        review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=? AND is_approved=1)
       WHERE p.id=?`,
      [product_id, product_id, product_id]
    );
    res.json({ success: true, message: 'Review submitted!' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Product operation failed.' });
  }
};

function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 500) throw new HttpError(400, 'Invalid image URL.');
  if (/^\/uploads\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return;
  try { const u = new URL(value); if (u.protocol === 'https:' && !u.username && !u.password) return; } catch (_) {}
  throw new HttpError(400, 'Images must use HTTPS or a local /uploads/ path.');
}
function validateProduct(product) {
  if (typeof product.name !== 'string' || !product.name.trim() || product.name.length > 200) throw new HttpError(400, 'Product name is required (maximum 200 characters).');
  integer(product.category_id, 'Category ID');
  const price = money(product.price);
  if (price === 0) throw new HttpError(400, 'Price must be greater than zero.');
  if (product.old_price != null && product.old_price !== '' && money(product.old_price, 'Original price') < price) throw new HttpError(400, 'Original price cannot be below the selling price.');
  integer(product.stock ?? 0, 'Stock', 0, 2147483647);
  if (product.image_url) imageUrl(product.image_url);
  if (product.is_active != null && ![0,1,true,false].includes(product.is_active)) throw new HttpError(400, 'Invalid active flag.');
}

const db       = require('../config/db');
const mailer   = require('../utils/mailer');
const whatsapp = require('../utils/whatsapp');

const crypto = require('crypto');
const { HttpError, integer, money, pagination, items: validateItems } = require('../utils/validation');
const genOrderNumber = () => 'PL-' + crypto.randomBytes(8).toString('hex');

// POST /api/orders  (protected)
exports.createOrder = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const { payment_method } = req.body;
    const address_id = integer(req.body.address_id, 'Address ID');
    const items = validateItems(req.body.items);
    if (!['card','upi','netbanking','cod','phonepe','gpay'].includes(payment_method)) throw new HttpError(400, 'Invalid payment method.');
    const [[address]] = await conn.execute('SELECT id FROM addresses WHERE id=? AND user_id=?', [address_id, req.user.id]);
    if (!address) throw new HttpError(400, 'Select one of your saved addresses.');

    // Validate stock & calculate totals
    let subtotal = 0;
    for (const item of items) {
      const [[p]] = await conn.execute('SELECT id,name,price,stock FROM products WHERE id=? AND is_active=1 FOR UPDATE', [item.product_id]);
      if (!p) throw new HttpError(400, `Product ${item.product_id} not found.`);
      if (p.stock < item.quantity) throw new HttpError(409, `"${p.name}" has only ${p.stock} items in stock.`);
      item._price = money(p.price) / 100;
      item._name  = p.name;
      subtotal += money(p.price) * item.quantity;
    }

    const shipping = money(process.env.SHIPPING_CHARGE || '50', 'Shipping charge') / 100;
    const total = (subtotal + money(shipping)) / 100;
    money(total, 'Order total');
    subtotal /= 100;
    const order_number = genOrderNumber();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number,user_id,address_id,subtotal,shipping_charge,total_amount,payment_method,razorpay_order_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [order_number, req.user.id, address_id, subtotal, shipping, total, payment_method, null]
    );
    const order_id = orderResult.insertId;

    // Insert order items & deduct stock
    for (const item of items) {
      await conn.execute(
        'INSERT INTO order_items (order_id,product_id,product_name,price,quantity,subtotal) VALUES (?,?,?,?,?,?)',
        [order_id, item.product_id, item._name, item._price, item.quantity, item._price * item.quantity]
      );
      await conn.execute('UPDATE products SET stock=stock-? WHERE id=?', [item.quantity, item.product_id]);
    }

    const [[user]] = await conn.execute('SELECT email,first_name,last_name,phone FROM users WHERE id=?', [req.user.id]);
    await conn.commit();

    // Send order receipt (payment may still be pending)
        mailer.sendOrderConfirmation(user.email, user.first_name, order_number, total).catch(err => console.error('Customer email error:', err.message));

    // Notify shop owner about new order
    const customerName = `${user.first_name} ${user.last_name}`;
   mailer.sendOwnerNotification(order_number, total, customerName, user.email, items).catch(err => console.error('Owner email error:', err.message));

    // WhatsApp notification to owner
    whatsapp.sendOrderWhatsApp(order_number, customerName, user.email, total, items).catch(()=>{});whatsapp.sendCustomerOrderWhatsApp(user.phone, user.first_name, order_number, total).catch(()=>{});

    res.status(201).json({ success: true, message: 'Order placed!', order_number, order_id, total });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  } finally {
    if (conn) conn.release();
  }
};

// GET /api/orders  (protected — own orders)
exports.getMyOrders = async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id
       WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, orders });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  }
};

// GET /api/orders/:id  (protected)
exports.getOrder = async (req, res) => {
  try {
    const [[order]] = await db.execute('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id=?', [order.id]);
    res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  }
};

// GET /api/orders/admin/all  (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const { limit, offset } = pagination(req.query);
    let where = []; let params = [];
    if (status) { where.push('o.status=?'); params.push(status); }
    const cond = where.length ? 'WHERE ' + where.join(' AND ') : '';
const limitNum = Number(limit);
const offsetNum = Number(offset);
const [orders] = await db.execute(
  `SELECT o.*, u.first_name, u.last_name, u.email FROM orders o JOIN users u ON o.user_id=u.id ${cond} ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
  params
);
res.json({ success: true, orders });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  }
};

// PUT /api/orders/:id/status  (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const transitions = { pending: ['confirmed'], confirmed: ['processing'], processing: ['shipped'], shipped: ['delivered'] };
    const id = integer(req.params.id, 'Order ID');
    const [result] = await db.execute("UPDATE orders SET status=? WHERE id=? AND status=? AND (payment_method='cod' OR payment_status='paid')", [status, id, Object.keys(transitions).find(key => transitions[key].includes(status)) || 'invalid']);
    if (!result.affectedRows) throw new HttpError(409, 'Invalid order status transition or unpaid order.');
    res.json({ success: true, message: `Order status updated to "${status}".` });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  }
};

// PUT /api/orders/:id/cancel  (protected — customer cancels own order)
exports.cancelOrder = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Fetch order and verify ownership
    const [[order]] = await conn.execute(
      'SELECT * FROM orders WHERE id=? AND user_id=? FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.payment_status === 'paid') throw new HttpError(409, 'Paid orders require a refund review. Contact the shop to cancel.');

    // Only allow cancel if pending or confirmed
    const cancellable = ['pending', 'confirmed'];
    if (!cancellable.includes(order.status)) {
      throw new HttpError(409, 'Only pending or confirmed orders can be cancelled.');
    }

    // Update order status to cancelled
    await conn.execute(
      'UPDATE orders SET status=? WHERE id=?',
      ['cancelled', order.id]
    );

    // Restore stock for each item
    const [items] = await conn.execute(
      'SELECT product_id, quantity FROM order_items WHERE order_id=?',
      [order.id]
    );
    for (const item of items) {
      await conn.execute(
        'UPDATE products SET stock=stock+? WHERE id=?',
        [item.quantity, item.product_id]
      );
    }

    const [[user]] = await conn.execute('SELECT email, first_name FROM users WHERE id=?', [req.user.id]);
    await conn.commit();

    // Notify owner (non-blocking)
    mailer.sendCancellationNotification(
      order.order_number,
      user.first_name,
      user.email,
      order.total_amount
    ).catch(() => {});

    // WhatsApp cancellation alert to owner
    whatsapp.sendCancelWhatsApp(order.order_number, user.first_name, order.total_amount).catch(() => {});

    res.json({ success: true, message: 'Order cancelled successfully. Stock has been restored.' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Order operation failed.' });
  } finally {
    if (conn) conn.release();
  }
};

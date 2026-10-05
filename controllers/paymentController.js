const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');
const { HttpError, integer, money } = require('../utils/validation');
const gateway = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Payment could not be processed.' });

exports.createRazorpayOrder = async (req, res) => {
  let conn;
  try {
    const id = integer(req.body.order_id, 'Order ID');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE id=? AND user_id=? FOR UPDATE', [id, req.user.id]);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.payment_method === 'cod' || order.payment_status !== 'pending' || order.status !== 'pending') throw new HttpError(409, 'Order is not awaiting online payment.');
    let payment;
    if (order.razorpay_order_id) payment = await gateway().orders.fetch(order.razorpay_order_id);
    else {
      payment = await gateway().orders.create({ amount: money(order.total_amount, 'Order total'), currency: 'INR', receipt: `order_${order.id}` });
      await conn.execute('UPDATE orders SET razorpay_order_id=? WHERE id=?', [payment.id, order.id]);
    }
    await conn.commit();
    res.json({ success: true, order_id: payment.id, amount: payment.amount, currency: payment.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) { if (conn) await conn.rollback(); fail(res, err); }
  finally { if (conn) conn.release(); }
};

exports.verifyPayment = async (req, res) => {
  let conn;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const id = integer(req.body.order_id, 'Order ID');
    if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || !/^[a-f0-9]{64}$/i.test(razorpay_signature || '')) throw new HttpError(400, 'Invalid payment details.');
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(razorpay_signature, 'hex'))) throw new HttpError(400, 'Payment verification failed.');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[order]] = await conn.execute('SELECT * FROM orders WHERE id=? AND user_id=? FOR UPDATE', [id, req.user.id]);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.razorpay_order_id !== razorpay_order_id || order.payment_method === 'cod') throw new HttpError(400, 'Payment does not belong to this order.');
    if (order.payment_status === 'paid') {
      if (order.razorpay_payment_id !== razorpay_payment_id) throw new HttpError(409, 'Order already has another payment.');
    } else {
      if (order.status !== 'pending' || order.payment_status !== 'pending') throw new HttpError(409, 'Order cannot accept payment.');
      const payment = await gateway().payments.fetch(razorpay_payment_id);
      if (payment.order_id !== razorpay_order_id || payment.currency !== 'INR' || payment.amount !== money(order.total_amount, 'Order total') || payment.status !== 'captured') throw new HttpError(400, 'Payment amount or capture status does not match.');
      const [[used]] = await conn.execute('SELECT id FROM orders WHERE razorpay_payment_id=? AND id<>?', [razorpay_payment_id, id]);
      if (used) throw new HttpError(409, 'Payment already used.');
      await conn.execute("UPDATE orders SET payment_status='paid', razorpay_payment_id=?, status='confirmed' WHERE id=?", [razorpay_payment_id, id]);
    }
    await conn.commit();
    res.json({ success: true, message: 'Payment verified successfully!' });
  } catch (err) { if (conn) await conn.rollback(); fail(res, err); }
  finally { if (conn) conn.release(); }
};

exports.confirmCOD = async (req, res) => {
  try {
    const id = integer(req.body.order_id, 'Order ID');
    const [result] = await db.execute("UPDATE orders SET status='confirmed' WHERE id=? AND user_id=? AND payment_method='cod' AND payment_status='pending' AND status IN ('pending','confirmed')", [id, req.user.id]);
    if (!result.affectedRows) throw new HttpError(409, 'No eligible cash on delivery order found.');
    res.json({ success: true, message: 'Cash on Delivery order confirmed!' });
  } catch (err) { fail(res, err); }
};

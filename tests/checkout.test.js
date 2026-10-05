const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
function loadController(file, db, razorpay) {
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name === '../config/db') return db;
    if (name === 'razorpay') return razorpay;
    if (name === '../utils/mailer') return {sendOrderConfirmation: async()=>{},sendOwnerNotification:async()=>{},sendCancellationNotification:async()=>{}};
    if (name === '../utils/whatsapp') return {sendOrderWhatsApp:async()=>{},sendCustomerOrderWhatsApp:async()=>{},sendCancelWhatsApp:async()=>{}};
    return original.call(this,name,...args);
  };
  try { delete require.cache[require.resolve(file)]; return require(file); }
  finally { Module._load = original; }
}
function response() { return {code:200, status(n){this.code=n;return this;},json(body){this.body=body;return this;}}; }
function connection(execute) { return {execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}}; }
test('Razorpay amount comes from the owned order, ignoring client amount',async()=>{
  let sent;
  const conn=connection(async sql=>sql.startsWith('SELECT') ? [[{id:4,total_amount:'149.50',payment_method:'upi',payment_status:'pending',status:'pending'}]] : [{}]);
  class Gateway { constructor(){this.orders={create:async options=>{sent=options;return {id:'order_test',amount:options.amount,currency:'INR'};}};} }
  const controller=loadController('../controllers/paymentController',{getConnection:async()=>conn},Gateway);
  const res=response();
  await controller.createRazorpayOrder({body:{order_id:4,amount:1},user:{id:2}},res);
  assert.equal(res.code,200);assert.equal(sent.amount,14950);
});
test('Razorpay order cannot be created for another customer',async()=>{
  let gatewayUsed=false;
  class Gateway {constructor(){gatewayUsed=true;}}
  const controller=loadController('../controllers/paymentController',{getConnection:async()=>connection(async()=>[[]])},Gateway);
  const res=response();await controller.createRazorpayOrder({body:{order_id:4},user:{id:2}},res);
  assert.equal(res.code,404);assert.equal(gatewayUsed,false);
});
test('duplicate product quantities are checked together against locked stock',async()=>{
  let rolledBack=false, inserted=false, locked=false;
  const conn=connection(async sql=>{
    if (sql.includes('FROM addresses')) return [[{id:1}]];
    if (sql.includes('FROM products')) {locked=sql.includes('FOR UPDATE');return [[{id:1,name:'Bow',price:'99.00',stock:3}]];}
    inserted=true;return [{insertId:1}];
  });
  conn.rollback=async()=>{rolledBack=true;};
  const controller=loadController('../controllers/orderController',{getConnection:async()=>conn});
  const res=response();await controller.createOrder({body:{address_id:1,payment_method:'cod',items:[{product_id:1,quantity:2},{product_id:1,quantity:2}]},user:{id:2}},res);
  assert.equal(res.code,409);assert.equal(locked,true);assert.equal(rolledBack,true);assert.equal(inserted,false);
});
test('paid cancellation is blocked before inventory is restored',async()=>{
  let restored=false;
  const conn=connection(async sql=>{if(sql.includes('FROM orders'))return [[{id:1,payment_status:'paid',status:'confirmed'}]];restored=true;return [[]];});
  const controller=loadController('../controllers/orderController',{getConnection:async()=>conn});
  const res=response();await controller.cancelOrder({params:{id:1},user:{id:2}},res);
  assert.equal(res.code,409);assert.equal(restored,false);
});
test('signed payment for another customer cannot update an order',async()=>{
  const crypto=require('node:crypto');process.env.RAZORPAY_KEY_SECRET='test_secret';
  const body={order_id:4,razorpay_order_id:'order_test',razorpay_payment_id:'pay_test'};
  body.razorpay_signature=crypto.createHmac('sha256','test_secret').update('order_test|pay_test').digest('hex');
  let updated=false;
  const conn=connection(async sql=>{if(sql.startsWith('SELECT'))return [[]];updated=true;return [{}];});
  const controller=loadController('../controllers/paymentController',{getConnection:async()=>conn},class {});
  const res=response();await controller.verifyPayment({body,user:{id:2}},res);
  assert.equal(res.code,404);assert.equal(updated,false);
});
test('valid signature with insufficient captured amount cannot mark order paid',async()=>{
  const crypto=require('node:crypto');process.env.RAZORPAY_KEY_SECRET='test_secret';
  const body={order_id:4,razorpay_order_id:'order_test',razorpay_payment_id:'pay_test'};
  body.razorpay_signature=crypto.createHmac('sha256','test_secret').update('order_test|pay_test').digest('hex');
  let updated=false;
  const conn=connection(async sql=>{if(sql.startsWith('SELECT'))return [[{id:4,total_amount:'149.50',razorpay_order_id:'order_test',payment_method:'upi',payment_status:'pending',status:'pending'}]];updated=true;return [{}];});
  class Gateway {constructor(){this.payments={fetch:async()=>({order_id:'order_test',currency:'INR',amount:100,status:'captured'})};}}
  const controller=loadController('../controllers/paymentController',{getConnection:async()=>conn},Gateway);
  const res=response();await controller.verifyPayment({body,user:{id:2}},res);
  assert.equal(res.code,400);assert.equal(updated,false);
});

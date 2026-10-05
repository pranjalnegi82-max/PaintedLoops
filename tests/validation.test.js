const { test } = require('node:test');
const assert = require('node:assert/strict');
const { money, items, pagination } = require('../utils/validation');
test('prices are converted to exact paise', () => {
  assert.equal(money('99.10'), 9910);
  assert.equal(money('0.01'), 1);
  for (const value of [-1, '1.001', '', null, Infinity, '1e3']) assert.throws(() => money(value));
});
test('checkout rejects invalid quantities and groups duplicate products', () => {
  for (const quantity of [-1, 0, 1.5, 'bad', null]) assert.throws(() => items([{ product_id: 1, quantity }]));
  assert.deepEqual(items([{ product_id: 2, quantity: 1 }, { product_id: 2, quantity: 2 }, { product_id: 1, quantity: 1 }]), [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 3 }]);
  assert.throws(() => items([]));
});
test('pagination rejects invalid and unbounded requests', () => {
  assert.deepEqual(pagination({page: '2', limit: '10'}), {page: 2, limit: 10, offset: 10});
  for (const query of [{page: -1}, {limit: 101}, {page: '1 OR 1=1'}, {limit: 0}]) assert.throws(() => pagination(query));
});

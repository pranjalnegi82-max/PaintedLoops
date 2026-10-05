class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function integer(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') throw new HttpError(400, `${name} must be an integer.`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be an integer between ${min} and ${max}.`);
  return n;
}
function money(value, name = 'Price') {
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(String(value))) throw new HttpError(400, `${name} must be a non-negative amount with at most two decimal places.`);
  const [whole, fraction = ''] = String(value).split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise > 9999999999) throw new HttpError(400, `${name} is too large.`);
  return paise;
}
function pagination(query) {
  const page = integer(query.page ?? 1, 'Page');
  const limit = integer(query.limit ?? 20, 'Limit', 1, 100);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new HttpError(400, 'Page is too large.');
  return { page, limit, offset };
}
function items(input) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new HttpError(400, 'Provide between 1 and 100 order items.');
  const grouped = new Map();
  for (const item of input) {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'Invalid order item.');
    const id = integer(item.product_id, 'Product ID');
    const quantity = integer(item.quantity, 'Quantity', 1, 999);
    const total = (grouped.get(id) || 0) + quantity;
    integer(total, 'Combined quantity', 1, 999);
    grouped.set(id, total);
  }
  return [...grouped].sort((a, b) => a[0] - b[0]).map(([product_id, quantity]) => ({ product_id, quantity }));
}
module.exports = { HttpError, integer, money, pagination, items };

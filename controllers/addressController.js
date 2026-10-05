const db = require('../config/db');
const { HttpError, integer } = require('../utils/validation');
const fail = (res, err) => res.status(err.status || 500).json({success: false, message: err.status ? err.message : 'Address operation failed.'});
function fields(body) {
  const limits = {full_name:100, phone:20, address_line1:255, city:100, state:100, pin_code:10};
  for (const [key, limit] of Object.entries(limits)) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > limit) throw new HttpError(400, `Provide a valid ${key}.`);
  if (!/^\d{6}$/.test(body.pin_code)) throw new HttpError(400, 'PIN code must contain 6 digits.');
  if (!/^[+0-9 ()-]{7,20}$/.test(body.phone)) throw new HttpError(400, 'Invalid phone number.');
  if (body.address_line2 != null && (typeof body.address_line2 !== 'string' || body.address_line2.length > 255)) throw new HttpError(400, 'Invalid second address line.');
  if (!['home','work','other'].includes(body.address_type || 'home')) throw new HttpError(400, 'Invalid address type.');
  if (body.is_default != null && ![true,false,0,1].includes(body.is_default)) throw new HttpError(400, 'Invalid default address flag.');
  return [body.full_name.trim(), body.phone, body.address_line1.trim(), body.address_line2 || null, body.city.trim(), body.state.trim(), body.pin_code, body.address_type || 'home', body.is_default ? 1 : 0];
}
exports.getAddresses = async (req, res) => {
  try { const [rows] = await db.execute('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id DESC', [req.user.id]); res.json({success:true, addresses:rows}); }
  catch (err) { fail(res, err); }
};
async function save(req, res, update) {
  let conn;
  try {
    const values = fields(req.body);
    const id = update ? integer(req.params.id, 'Address ID') : null;
    conn = await db.getConnection(); await conn.beginTransaction();
    // Serialize default-address changes for this customer.
    await conn.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [req.user.id]);
    if (update) {
      const [[existing]] = await conn.execute('SELECT id FROM addresses WHERE id=? AND user_id=? FOR UPDATE', [id, req.user.id]);
      if (!existing) throw new HttpError(404, 'Address not found.');
    }
    if (values[8]) await conn.execute('UPDATE addresses SET is_default=0 WHERE user_id=?', [req.user.id]);
    let result;
    if (update) [result] = await conn.execute('UPDATE addresses SET full_name=?,phone=?,address_line1=?,address_line2=?,city=?,state=?,pin_code=?,address_type=?,is_default=? WHERE id=? AND user_id=?', [...values,id,req.user.id]);
    else [result] = await conn.execute('INSERT INTO addresses (user_id,full_name,phone,address_line1,address_line2,city,state,pin_code,address_type,is_default) VALUES (?,?,?,?,?,?,?,?,?,?)', [req.user.id,...values]);
    await conn.commit();
    res.status(update ? 200 : 201).json({success:true,message: update ? 'Address updated.' : 'Address saved.',id: update ? id : result.insertId});
  } catch (err) { if (conn) await conn.rollback(); fail(res, err); }
  finally { if (conn) conn.release(); }
}
exports.addAddress = (req,res) => save(req,res,false);
exports.updateAddress = (req,res) => save(req,res,true);
exports.deleteAddress = async (req,res) => {
  try {
    const id = integer(req.params.id,'Address ID');
    const [result] = await db.execute('DELETE FROM addresses WHERE id=? AND user_id=?', [id,req.user.id]);
    if (!result.affectedRows) throw new HttpError(404,'Address not found.');
    res.json({success:true,message:'Address deleted.'});
  } catch (err) { if (err.code === 'ER_ROW_IS_REFERENCED_2') err = new HttpError(409,'This address is linked to an order and must be retained.'); fail(res,err); }
};

import { useState } from 'react';
import api from '../api/api';
import { ErrorMessage } from './Feedback';
export default function AddressForm({ onSaved }) {
 const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 async function submit(e) {
   e.preventDefault(); const form = e.currentTarget; setBusy(true); setError('');
   const data = Object.fromEntries(new FormData(form));
   try { await api.post('/addresses', { ...data, address_type: 'home', is_default: false }); form.reset(); onSaved(); }
   catch (e) { setError(e.message); } finally { setBusy(false); }
 }
 return <form className="form address-form" onSubmit={submit}><h3>Add a delivery address</h3><div className="form-row"><label>Full name<input name="full_name" required autoComplete="name" maxLength={100}/></label><label>Phone<input name="phone" type="tel" required pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number" autoComplete="tel-national"/></label></div><label>Address line 1<input name="address_line1" required autoComplete="address-line1" maxLength={255}/></label><label>Address line 2 <span className="muted">(optional)</span><input name="address_line2" autoComplete="address-line2" maxLength={255}/></label><div className="form-row"><label>City<input name="city" required autoComplete="address-level2" maxLength={100}/></label><label>State<input name="state" required autoComplete="address-level1" maxLength={100}/></label></div><label>PIN code<input name="pin_code" required inputMode="numeric" pattern="[1-9][0-9]{5}" title="Enter a valid 6-digit PIN code" autoComplete="postal-code"/></label>{error && <ErrorMessage message={error}/>}<button className="button secondary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button></form>;
}

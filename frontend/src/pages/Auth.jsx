import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { ErrorMessage } from '../components/Feedback';
export default function Auth() {
 const location = useLocation(); const navigate = useNavigate(); const register = location.pathname === '/register';
 const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 const from = location.state?.from || '/account';
 async function submit(e) {
   e.preventDefault(); setBusy(true); setError(''); const data = Object.fromEntries(new FormData(e.currentTarget));
   data.email = data.email.trim().toLowerCase();
   try { const result = await api.post(register ? '/auth/register' : '/auth/login', data); localStorage.setItem('token', result.token); localStorage.setItem('pl-user-id', String(result.user.id)); navigate(from, { replace: true }); }
   catch (e) { setError(e.message); } finally { setBusy(false); }
 }
 return <main id="main" className="container page"><section className="auth-panel"><span className="eyebrow">Your little corner of PaintedLoops</span><h1>{register ? 'Make yourself at home' : 'Lovely to see you again'}</h1><p>{register ? 'Create an account to save your addresses and track orders.' : 'Sign in to pick up where you left off.'}</p><form onSubmit={submit} className="form">{register && <><div className="form-row"><label>First name<input name="first_name" required maxLength={50} autoComplete="given-name"/></label><label>Last name<input name="last_name" required maxLength={50} autoComplete="family-name"/></label></div><label>Phone number<input name="phone" type="tel" required pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number" autoComplete="tel-national"/></label></>}<label>Email<input name="email" type="email" required autoComplete="email" maxLength={100}/></label><label>Password<input name="password" type="password" required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'}/></label>{register && <p className="small muted">Use at least 8 characters.</p>}{error && <ErrorMessage message={error}/>}<button className="button wide" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button></form><p className="auth-switch">{register ? 'Already part of the family?' : 'New around here?'} <Link to={register ? '/login' : '/register'} state={{ from }}>{register ? 'Sign in' : 'Create an account'}</Link></p></section></main>;
}

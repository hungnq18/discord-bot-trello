import { useState } from 'react';
import { post } from '../api.js';

export default function Login({ onDone }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try { await post('/login', { password: pw }); onDone(); }
    catch (e2) { setErr(e2.message); }
  };

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Đăng nhập portal</h2>
      <label>Mật khẩu</label>                                                                                                                                                                                                                           
      <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <p><button className="btn">Đăng nhập</button></p>
      {err && <div className="msg err">{err}</div>}
    </form>
  );
}                                 

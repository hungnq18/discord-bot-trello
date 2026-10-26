import { useEffect, useState } from 'react';
import { api, post, AuthError } from './api.js';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Tasks from './pages/Tasks.jsx';
import Docs from './pages/Docs.jsx';
import Logs from './pages/Logs.jsx';
import Reports from './pages/Reports.jsx';

const TABS = [
  ['overview', 'Tổng quan', Overview],
  ['tasks', 'Tạo task', Tasks],
  ['docs', 'Tài liệu', Docs],
  ['logs', 'Log', Logs],
  ['reports', 'Báo cáo', Reports],
];

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => { api('/session').then((s) => setAuthed(s.authed), () => setAuthed(false)); }, []);

  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const Page = TABS.find(([id]) => id === tab)[2];
  const onError = (e) => { if (e instanceof AuthError) setAuthed(false); };

  return (
    <>
      <header>
        <h1>Bot Portal</h1>
        <nav>
          {TABS.map(([id, label]) => (
            <button key={id} className={id === tab ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <button className="btn ghost" onClick={async () => { await post('/logout'); setAuthed(false); }}>Đăng xuất</button>
      </header>
      <main><Page onError={onError} /></main>
    </>
  );
}

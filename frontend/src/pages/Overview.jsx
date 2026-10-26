import { useState } from 'react';
import { api, post } from '../api.js';
import { useAsync } from '../hooks.js';

const ACTIONS = [
  ['tick-done', 'Tick task trong Done'],
  ['check-due', 'Quét hạn ngay'],
  ['weekly-report', 'Tạo báo cáo + lịch họp'],
];

export default function Overview({ onError }) {
  const { data: o, error, reload } = useAsync(() => api('/overview').catch((e) => { onError(e); throw e; }));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const run = async (act) => {
    setBusy(act); setMsg(null);
    try { setMsg({ ok: true, text: JSON.stringify(await post('/actions/' + act)) }); reload(); }
    catch (e) { onError(e); setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };

  return (
    <>
      <div className="card">
        {error && error.message}
        {!o && !error && 'Đang tải...'}
        {o && (
          <>
            <h2>Tiến độ dự án</h2>
            <div className="bar"><i style={{ width: o.progress + '%' }} /></div>
            <b>{o.progress}%</b> <span className="mute">({o.done}/{o.total} task)</span>
            <div className="grid">
              <Stat n={o.review} label="Chờ review" />
              <Stat n={o.overdue} label="Quá hạn" color="var(--err)" />
              <Stat n={o.errors24h} label="Lỗi bot 24h" />
              {o.lists.map((l) => <Stat key={l.name} n={l.count} label={l.name} />)}
            </div>
          </>
        )}
      </div>
      <div className="card">
        <h2>Tác vụ thủ công</h2>
        <div className="row">
          {ACTIONS.map(([id, label]) => (
            <button key={id} className="btn fit" disabled={!!busy} onClick={() => run(id)}>
              {busy === id ? 'Đang chạy...' : label}
            </button>
          ))}
        </div>
        {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
      </div>
    </>
  );
}

const Stat = ({ n, label, color }) => (
  <div className="stat"><b style={{ color }}>{n}</b><span>{label}</span></div>
);

import { useCallback, useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const PAGE = 100;

export default function Logs({ onError }) {
  const [filter, setFilter] = useState({ level: '', source: '', q: '' });
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [sources, setSources] = useState([]);
  const [auto, setAuto] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (before) => {
    const p = new URLSearchParams({ limit: PAGE });
    Object.entries(filter).forEach(([k, v]) => v && p.set(k, v));
    if (before) p.set('before', before);
    try {
      const page = await api('/logs?' + p);
      setRows((r) => (before ? [...r, ...page] : page));
      setMore(page.length === PAGE);
      setErr('');
    } catch (e) { onError(e); setErr(e.message); }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/logs/sources').then(setSources).catch(() => {}); }, [rows.length]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => load(), 5000);
    return () => clearInterval(t);
  }, [auto, load]);

  const set = (k, v) => setFilter((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="card row">
        <div>
          <label>Mức</label>
          <select value={filter.level} onChange={(e) => set('level', e.target.value)}>
            <option value="">Tất cả</option><option>info</option><option>warn</option><option>error</option>
          </select>
        </div>
        <div>
          <label>Nguồn</label>
          <select value={filter.source} onChange={(e) => set('source', e.target.value)}>
            <option value="">Tất cả</option>
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label>Tìm</label><input value={filter.q} onChange={(e) => set('q', e.target.value)} /></div>
        <button className="btn ghost fit" onClick={() => setAuto(!auto)}>Tự làm mới: {auto ? 'bật' : 'tắt'}</button>
      </div>
      <div className="card scroll">
        {err && <div className="msg err">{err}</div>}
        <table>
          <thead><tr><th>Thời gian</th><th>Mức</th><th>Nguồn</th><th>Sự kiện</th><th>Nội dung</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{fmt(r.ts)}</td>
                <td><span className={'tag ' + r.level}>{r.level}</span></td>
                <td>{r.source}</td><td>{r.event}</td><td>{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {more && <p><button className="btn ghost" onClick={() => load(rows[rows.length - 1].id)}>Tải thêm</button></p>}
      </div>
    </>
  );
}

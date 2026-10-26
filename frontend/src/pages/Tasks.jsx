import { useState } from 'react';
import { api, post } from '../api.js';
import { useAsync } from '../hooks.js';

export default function Tasks({ onError }) {
  const { data: meta, error } = useAsync(() => api('/meta').catch((e) => { onError(e); throw e; }));
  const [f, setF] = useState({ name: '', desc: '', listId: '', due: '', memberIds: [] });
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  if (error) return <div className="card">{error.message}</div>;
  if (!meta) return <div className="card">Đang tải...</div>;

  const listId = f.listId || (meta.lists.find((l) => /to ?do/i.test(l.name)) || meta.lists[0])?.id;
  const toggle = (id) => set('memberIds', f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await post('/tasks', { ...f, listId, due: f.due || null });
      setMsg({ ok: true, url: r.url });
      setF({ name: '', desc: '', listId: '', due: '', memberIds: [] });
    } catch (e2) { onError(e2); setMsg({ ok: false, text: e2.message }); }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>Tạo task nhanh lên Trello</h2>
      <label>Tên task</label>
      <input value={f.name} onChange={(e) => set('name', e.target.value)} required />
      <label>Mô tả</label>
      <textarea rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} />
      <div className="row">
        <div>
          <label>List</label>
          <select value={listId} onChange={(e) => set('listId', e.target.value)}>
            {meta.lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label>Hạn</label>
          <input type="datetime-local" value={f.due} onChange={(e) => set('due', e.target.value)} />
        </div>
      </div>
      <label>Giao cho</label>
      <div className="row">
        {meta.members.map((m) => (
          <label key={m.id} className="fit check">
            <input type="checkbox" checked={f.memberIds.includes(m.id)} onChange={() => toggle(m.id)} /> {m.fullName}
          </label>
        ))}
      </div>
      <p><button className="btn">Tạo task</button></p>
      {msg?.ok && <div className="msg ok">Đã tạo: <a href={msg.url} target="_blank" rel="noopener noreferrer">{msg.url}</a></div>}
      {msg && !msg.ok && <div className="msg err">{msg.text}</div>}
    </form>
  );
}

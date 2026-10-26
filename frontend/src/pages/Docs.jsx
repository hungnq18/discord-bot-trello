import { useRef, useState } from 'react';
import { api, fmt, fmtSize } from '../api.js';
import { useAsync } from '../hooks.js';

export default function Docs({ onError }) {
  const { data: docs, error, reload } = useAsync(() => api('/documents').catch((e) => { onError(e); throw e; }));
  const [form, setForm] = useState({ docId: '', title: '', uploader: '', note: '' });
  const [msg, setMsg] = useState(null);
  const [hist, setHist] = useState(null);
  const fileRef = useRef();
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current.files[0];
    if (!file) return setMsg({ ok: false, text: 'Chọn file trước' });
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('file', file);
    try {
      const r = await api('/documents', { method: 'POST', body: fd });
      setMsg({ ok: true, text: `Đã lưu "${r.doc.title}" v${r.version}` });
      fileRef.current.value = '';
      setForm((s) => ({ ...s, title: '', note: '' }));
      reload();
    } catch (e2) { onError(e2); setMsg({ ok: false, text: e2.message }); }
  };

  const showHistory = async (id) => setHist(await api('/documents/' + id));
  const remove = async (id) => {
    if (!confirm('Xóa tài liệu và toàn bộ phiên bản?')) return;
    await api('/documents/' + id, { method: 'DELETE' });
    setHist(null); reload();
  };

  return (
    <>
      <form className="card" onSubmit={upload}>
        <h2>Tải tài liệu lên</h2>
        <div className="row">
          <div>
            <label>Tải lên dưới dạng</label>
            <select value={form.docId} onChange={(e) => set('docId', e.target.value)}>
              <option value="">Tài liệu mới</option>
              {docs?.map((d) => <option key={d.id} value={d.id}>Phiên bản mới của: {d.title}</option>)}
            </select>
          </div>
          <div>
            <label>Tên tài liệu (nếu mới)</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} disabled={!!form.docId} />
          </div>
        </div>
        <div className="row">
          <div><label>Người tải</label><input value={form.uploader} onChange={(e) => set('uploader', e.target.value)} /></div>
          <div><label>Ghi chú thay đổi</label><input value={form.note} onChange={(e) => set('note', e.target.value)} /></div>
        </div>
        <label>File (tối đa 25MB)</label>
        <input type="file" ref={fileRef} />
        <p><button className="btn">Tải lên</button></p>
        {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
      </form>

      <div className="card scroll">
        <h2>Danh sách tài liệu</h2>
        {error && error.message}
        <table>
          <thead><tr><th>Tài liệu</th><th>Phiên bản</th><th>Cập nhật</th><th>Người tải</th><th /></tr></thead>
          <tbody>
            {docs?.map((d) => (
              <tr key={d.id}>
                <td><b>{d.title}</b><br /><span className="mute">{d.filename} · {fmtSize(d.size)}</span></td>
                <td>v{d.latest}</td>
                <td>{fmt(d.updated_at)}</td>
                <td>{d.uploader}</td>
                <td className="row">
                  <a className="btn ghost fit" href={`/api/documents/${d.id}/download/${d.latest}`}>Tải</a>
                  <button className="btn ghost fit" onClick={() => showHistory(d.id)}>Lịch sử</button>
                  <button className="btn danger fit" onClick={() => remove(d.id)}>Xóa</button>
                </td>
              </tr>
            ))}
            {docs?.length === 0 && <tr><td className="mute">Chưa có tài liệu</td></tr>}
          </tbody>
        </table>
      </div>

      {hist && (
        <div className="card scroll">
          <h2>Lịch sử chỉnh sửa: {hist.title}</h2>
          <table>
            <thead><tr><th>Ver</th><th>File</th><th>Ghi chú</th><th>Người tải</th><th>Thời gian</th><th /></tr></thead>
            <tbody>
              {hist.versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version}</td>
                  <td>{v.filename} <span className="mute">{fmtSize(v.size)}</span></td>
                  <td>{v.note}</td><td>{v.uploader}</td><td>{fmt(v.created_at)}</td>
                  <td><a href={`/api/documents/${hist.id}/download/${v.version}`}>Tải</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

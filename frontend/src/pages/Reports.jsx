import { api, fmt } from '../api.js';
import { useAsync } from '../hooks.js';

export default function Reports({ onError }) {
  const { data, error } = useAsync(() => api('/reports').catch((e) => { onError(e); throw e; }));
  if (error) return <div className="card">{error.message}</div>;
  if (!data) return <div className="card">Đang tải...</div>;
  if (!data.length) return <div className="card mute">Chưa có báo cáo nào</div>;
  return data.map((r) => (
    <div className="card" key={r.id}>
      <h2>{fmt(r.week_start)} → {fmt(r.week_end)} · {r.progress}%</h2>
      <div className="bar"><i style={{ width: r.progress + '%' }} /></div>
      <pre>{r.summary}</pre>
    </div>
  ));
}

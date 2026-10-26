export class AuthError extends Error {}

export async function api(path, opts = {}) {
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') throw new AuthError('Hết phiên đăng nhập');
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const post = (path, body) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

export const fmt = (d) => new Date(d).toLocaleString('vi-VN');
export const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB');

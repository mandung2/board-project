export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + password));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function readJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

export async function requireUser(env, body) {
  const id = (body.id || '').trim();
  const token = body.token || '';
  if (!id || !token) return null;
  const row = await env.DB.prepare('SELECT id, session_token FROM users WHERE id = ?').bind(id).first();
  if (!row || row.session_token !== token) return null;
  return row;
}

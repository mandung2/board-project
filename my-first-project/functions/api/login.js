import { json, readJson, hashPassword, randomHex } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const id = (b.id || '').trim();
  const password = String(b.password || '');
  if (!id || !password) return json({ ok: false, msg: '아이디와 비밀번호를 입력하세요.' });

  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, msg: '가입되지 않은 아이디입니다.' });

  const [salt, expected] = String(row.password_hash).split('$');
  const hash = await hashPassword(password, salt);
  if (hash !== expected) return json({ ok: false, msg: '비밀번호가 맞지 않습니다.' });

  const token = randomHex(24);
  await env.DB.prepare('UPDATE users SET session_token = ? WHERE id = ?').bind(token, id).run();

  return json({ ok: true, token, user: { id: row.id, nickname: row.nickname } });
}

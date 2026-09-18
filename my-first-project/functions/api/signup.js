import { json, readJson, hashPassword, randomHex } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const id = (b.id || '').trim();
  const password = String(b.password || '');
  const nickname = (b.nickname || '').trim() || id;

  if (!id || !password) return json({ ok: false, msg: '아이디와 비밀번호를 입력하세요.' });
  if (password.length < 4) return json({ ok: false, msg: '비밀번호는 4자 이상이어야 합니다.' });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (existing) return json({ ok: false, msg: '이미 사용 중인 아이디입니다.' });

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const token = randomHex(24);
  await env.DB.prepare(
    'INSERT INTO users (id, password_hash, nickname, session_token) VALUES (?, ?, ?, ?)'
  ).bind(id, salt + '$' + hash, nickname, token).run();

  return json({ ok: true, token, user: { id, nickname } });
}

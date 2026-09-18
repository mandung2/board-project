import { json, readJson, requireUser, randomHex } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false });

  const date = (b.date || '').trim();
  const text = (b.text || '').trim();
  if (!date || !text) return json({ ok: false, msg: '날짜와 내용을 입력하세요.' });

  const id = randomHex(12);
  await env.DB.prepare(
    'INSERT INTO todos (id, user_id, date, text, done) VALUES (?, ?, ?, ?, 0)'
  ).bind(id, user.id, date, text).run();

  return json({ ok: true, item: { id, date, text, done: false } });
}

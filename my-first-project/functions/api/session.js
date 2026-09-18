import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false });

  const row = await env.DB.prepare('SELECT id, nickname FROM users WHERE id = ?').bind(user.id).first();
  return json({ ok: true, user: { id: row.id, nickname: row.nickname } });
}

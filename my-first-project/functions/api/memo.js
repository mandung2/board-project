import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false, content: '' });

  const row = await env.DB.prepare('SELECT content FROM memos WHERE user_id = ?').bind(user.id).first();
  return json({ ok: true, content: row ? row.content : '' });
}

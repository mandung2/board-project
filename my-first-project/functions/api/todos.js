import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false, items: [] });

  const { results } = await env.DB.prepare(
    'SELECT id, date, text, done FROM todos WHERE user_id = ? ORDER BY created_at ASC'
  ).bind(user.id).all();

  return json({ ok: true, items: results.map(r => ({ ...r, done: !!r.done })) });
}

import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false });

  const content = String(b.content ?? '');
  await env.DB.prepare(
    `INSERT INTO memos (user_id, content, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
  ).bind(user.id, content).run();

  return json({ ok: true });
}

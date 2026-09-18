import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false });

  const todoId = b.todoId || '';
  if (!todoId) return json({ ok: false });

  await env.DB.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').bind(todoId, user.id).run();

  return json({ ok: true });
}

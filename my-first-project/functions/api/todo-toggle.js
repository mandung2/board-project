import { json, readJson, requireUser } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const user = await requireUser(env, b);
  if (!user) return json({ ok: false });

  const todoId = b.todoId || '';
  if (!todoId) return json({ ok: false });

  const row = await env.DB.prepare('SELECT done FROM todos WHERE id = ? AND user_id = ?').bind(todoId, user.id).first();
  if (!row) return json({ ok: false });

  const done = row.done ? 0 : 1;
  await env.DB.prepare('UPDATE todos SET done = ? WHERE id = ? AND user_id = ?').bind(done, todoId, user.id).run();

  return json({ ok: true, done: !!done });
}

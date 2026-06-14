import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireClerkAuth } from "@/lib/forms.functions";

async function verifyClientOwnership(clientId: string, userId: string) {
  const rows = await sql`
    SELECT id, owner_id FROM clients WHERE id = ${clientId} LIMIT 1
  `;
  if (rows.length === 0) throw new Error("Client not found");
  if (rows[0].owner_id !== userId) {
    throw new Error("Unauthorized: Client does not belong to you");
  }
}

async function verifyTaskOwnership(taskId: string, userId: string) {
  const rows = await sql`
    SELECT ct.*, c.owner_id
    FROM client_tasks ct
    JOIN clients c ON ct.client_id = c.id
    WHERE ct.id = ${taskId}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("Task not found");
  const task = rows[0];
  if (task.owner_id !== userId) {
    throw new Error("Unauthorized: Task belongs to another client");
  }
  return task;
}

export const listClientTasks = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyClientOwnership(data.clientId, context.userId);

    const rows = await sql`
      SELECT id, client_id as "clientId", title, due_date as "dueDate", completed, created_at as "createdAt"
      FROM client_tasks
      WHERE client_id = ${data.clientId}
      ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC
    `;

    return rows.map((r) => ({
      id: String(r.id),
      clientId: String(r.clientId),
      title: String(r.title),
      dueDate: r.dueDate ? String(r.dueDate) : undefined,
      completed: Boolean(r.completed),
      createdAt: String(r.createdAt),
    }));
  });

export const createClientTask = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string; title: string; dueDate?: string }) =>
    z
      .object({
        clientId: z.string().uuid(),
        title: z.string().min(1).max(500),
        dueDate: z.string().datetime().optional().or(z.literal("")).or(z.null()),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await verifyClientOwnership(data.clientId, context.userId);

    const dueDateVal = data.dueDate ? data.dueDate : null;

    const rows = await sql`
      INSERT INTO client_tasks (client_id, title, due_date)
      VALUES (${data.clientId}, ${data.title}, ${dueDateVal})
      RETURNING id, client_id as "clientId", title, due_date as "dueDate", completed, created_at as "createdAt"
    `;

    const task = rows[0];

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${data.clientId}, ${`Task created: "${data.title}"`}, 'update')
    `;

    return {
      id: String(task.id),
      clientId: String(task.clientId),
      title: String(task.title),
      dueDate: task.dueDate ? String(task.dueDate) : undefined,
      completed: Boolean(task.completed),
      createdAt: String(task.createdAt),
    };
  });

export const updateClientTask = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(
    (d: { id: string; completed?: boolean; title?: string; dueDate?: string | null }) =>
      z
        .object({
          id: z.string().uuid(),
          completed: z.boolean().optional(),
          title: z.string().min(1).max(500).optional(),
          dueDate: z.string().datetime().optional().or(z.literal("")).or(z.null()),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const task = await verifyTaskOwnership(data.id, context.userId);

    const title = data.title !== undefined ? data.title : task.title;
    const completed = data.completed !== undefined ? data.completed : task.completed;
    const dueDate =
      data.dueDate !== undefined ? (data.dueDate ? data.dueDate : null) : task.due_date;

    const rows = await sql`
      UPDATE client_tasks
      SET title = ${title},
          completed = ${completed},
          due_date = ${dueDate}
      WHERE id = ${data.id}
      RETURNING id, client_id as "clientId", title, due_date as "dueDate", completed, created_at as "createdAt"
    `;

    const updatedTask = rows[0];

    if (data.completed !== undefined && data.completed !== task.completed) {
      const label = data.completed
        ? `Task completed: "${updatedTask.title}"`
        : `Task incomplete: "${updatedTask.title}"`;
      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${updatedTask.clientId}, ${label}, 'update')
      `;
    }

    return {
      id: String(updatedTask.id),
      clientId: String(updatedTask.clientId),
      title: String(updatedTask.title),
      dueDate: updatedTask.dueDate ? String(updatedTask.dueDate) : undefined,
      completed: Boolean(updatedTask.completed),
      createdAt: String(updatedTask.createdAt),
    };
  });

export const deleteClientTask = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const task = await verifyTaskOwnership(data.id, context.userId);

    await sql`
      DELETE FROM client_tasks WHERE id = ${data.id}
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${task.client_id}, ${`Task deleted: "${task.title}"`}, 'update')
    `;

    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db.server";
import { requireClerkAuth } from "@/lib/auth.middleware";
import { formatNotificationAmount } from "@/lib/notifications.server";

export type InvoiceLineItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export type InvoiceRecord = {
  id: string;
  ownerId: string;
  clientId: string;
  clientCompany?: string;
  clientName?: string;
  clientEmail?: string;
  title: string;
  amount: number;
  status: "Unpaid" | "Paid" | "Overdue";
  dueDate?: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  sendAt?: string;
  sentAt?: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

const LineItemSchema = z.object({
  description: z.string().min(1).max(500),
  qty: z.number().min(0.001),
  unitPrice: z.number().min(0),
});

const InvoicePayloadSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1).max(200),
  amount: z.number().min(0),
  status: z.enum(["Unpaid", "Paid", "Overdue"]),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(LineItemSchema).max(50).optional(),
  sendAt: z.string().optional(), // ISO date string for scheduled send
  deliveryMethod: z.enum(["immediate", "scheduled", "none"]).optional(),
});

function parseLineItems(raw: unknown): InvoiceLineItem[] {
  if (Array.isArray(raw)) return raw as InvoiceLineItem[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) ?? [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeInvoice(row: Record<string, unknown>): InvoiceRecord {
  const lineItems = parseLineItems(row.line_items);
  // Compute total from line items if present, otherwise use stored amount
  const computedAmount =
    lineItems.length > 0
      ? lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
      : Number(row.amount);

  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    clientId: String(row.client_id),
    clientCompany: row.client_company ? String(row.client_company) : undefined,
    clientName: row.client_full_name ? String(row.client_full_name) : undefined,
    clientEmail: row.client_email ? String(row.client_email) : undefined,
    title: String(row.title),
    amount: computedAmount,
    status: String(row.status) as InvoiceRecord["status"],
    dueDate: row.due_date ? String(row.due_date) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    lineItems,
    sendAt: row.send_at ? String(row.send_at) : undefined,
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    issuedAt: String(row.issued_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT i.*, c.company as client_company, c.full_name as client_full_name, c.email as client_email
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.owner_id = ${context.userId}::uuid
      ORDER BY i.created_at DESC
    `;
    return rows.map((row) => normalizeInvoice(row as Record<string, unknown>));
  });

export const listClientInvoices = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      SELECT i.*, c.company as client_company, c.full_name as client_full_name, c.email as client_email
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.client_id = ${data.clientId} AND i.owner_id = ${context.userId}::uuid
      ORDER BY i.created_at DESC
    `;
    return rows.map((row) => normalizeInvoice(row as Record<string, unknown>));
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(InvoicePayloadSchema)
  .handler(async ({ context, data }) => {
    // Verify client exists and belongs to owner
    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${data.clientId} AND owner_id = ${context.userId}::uuid LIMIT 1
    `;
    if (clientCheck.length === 0) throw new Error("Client not found or unauthorized");

    const lineItems = data.lineItems ?? [];
    const computedAmount =
      lineItems.length > 0
        ? lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
        : data.amount;

    const deliveryMethod = data.deliveryMethod ?? (data.sendAt ? "scheduled" : "immediate");
    const dbSendAt = deliveryMethod === "scheduled" ? data.sendAt || null : null;

    const rows = await sql`
      INSERT INTO invoices (owner_id, client_id, title, amount, status, due_date, notes, line_items, send_at)
      VALUES (
        ${context.userId}::uuid,
        ${data.clientId}::uuid,
        ${data.title},
        ${computedAmount},
        ${data.status},
        ${data.dueDate ? data.dueDate : null},
        ${data.notes ?? ""},
        ${JSON.stringify(lineItems)}::jsonb,
        ${dbSendAt}
      )
      RETURNING *
    `;

    // Log client activity
    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${data.clientId}, ${`Invoice "${data.title}" ($${computedAmount.toFixed(2)}) created`}, 'update')
    `;

    // Create in-app notification
    try {
      const { createNotification } = await import("./notifications.server");
      await createNotification(
        context.userId,
        `New invoice "${data.title}" ($${formatNotificationAmount(computedAmount)}) created`,
        `/invoices`,
      );
    } catch (e) {
      console.error("Failed to trigger invoice notification:", e);
    }

    // If delivery is immediate, send immediately
    if (deliveryMethod === "immediate") {
      try {
        const clientRow = await sql`
          SELECT email, full_name, company FROM clients WHERE id = ${data.clientId} LIMIT 1
        `;
        if (clientRow.length > 0) {
          const { sendInvoiceEmail } = await import("./email.server");
          await sendInvoiceEmail({
            to: String(clientRow[0].email),
            clientName: String(clientRow[0].full_name),
            clientCompany: String(clientRow[0].company),
            invoiceTitle: data.title,
            invoiceId: String(rows[0].id),
            amount: computedAmount,
            status: data.status,
            dueDate: data.dueDate,
            notes: data.notes,
            lineItems,
          });
          // Mark as sent
          await sql`UPDATE invoices SET sent_at = NOW() WHERE id = ${rows[0].id}`;
        }
      } catch (e) {
        console.error("Failed to send invoice email:", e);
      }
    }

    // Refetch with join
    const finalRows = await sql`
      SELECT i.*, c.company as client_company, c.full_name as client_full_name, c.email as client_email
      FROM invoices i JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${rows[0].id}
    `;
    return normalizeInvoice(finalRows[0] as Record<string, unknown>);
  });

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      patch: InvoicePayloadSchema.partial(),
    }),
  )
  .handler(async ({ context, data }) => {
    const currentRows = await sql`
      SELECT * FROM invoices WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid LIMIT 1
    `;
    if (currentRows.length === 0) throw new Error("Invoice not found");
    const current = currentRows[0];

    const title = data.patch.title ?? String(current.title);
    const status = data.patch.status ?? String(current.status);
    const dueDate =
      data.patch.dueDate !== undefined
        ? data.patch.dueDate
        : current.due_date
          ? String(current.due_date)
          : null;
    const notes =
      data.patch.notes !== undefined
        ? data.patch.notes
        : current.notes
          ? String(current.notes)
          : "";

    const lineItems =
      data.patch.lineItems !== undefined
        ? data.patch.lineItems
        : parseLineItems(current.line_items);

    const computedAmount =
      lineItems.length > 0
        ? lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
        : (data.patch.amount ?? Number(current.amount));

    const deliveryMethod = data.patch.deliveryMethod;
    let sendAtVal =
      data.patch.sendAt !== undefined
        ? data.patch.sendAt
        : current.send_at
          ? String(current.send_at)
          : null;
    let sentAtVal = current.sent_at ? String(current.sent_at) : null;
    let triggerImmediateSend = false;

    if (deliveryMethod === "none") {
      sendAtVal = null;
    } else if (deliveryMethod === "scheduled") {
      sentAtVal = null; // reset sent status when rescheduling
      sendAtVal = data.patch.sendAt ?? sendAtVal;
    } else if (deliveryMethod === "immediate") {
      sendAtVal = null;
      if (!sentAtVal) {
        triggerImmediateSend = true;
        sentAtVal = new Date().toISOString();
      }
    }

    const rows = await sql`
      UPDATE invoices
      SET title = ${title},
          amount = ${computedAmount},
          status = ${status},
          due_date = ${dueDate ? dueDate : null},
          notes = ${notes},
          line_items = ${JSON.stringify(lineItems)}::jsonb,
          send_at = ${sendAtVal ? sendAtVal : null},
          sent_at = ${sentAtVal ? new Date(sentAtVal) : null},
          updated_at = NOW()
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING *
    `;

    if (status !== current.status) {
      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${current.client_id}, ${`Invoice "${title}" status updated to ${status}`}, 'update')
      `;

      try {
        const { createNotification } = await import("./notifications.server");
        await createNotification(
          context.userId,
          `Invoice "${title}" marked as ${status}`,
          `/invoices`,
        );
      } catch (e) {
        console.error("Failed to trigger invoice status notification:", e);
      }
    }

    if (triggerImmediateSend) {
      try {
        const clientRow = await sql`
          SELECT email, full_name, company FROM clients WHERE id = ${current.client_id} LIMIT 1
        `;
        if (clientRow.length > 0) {
          const { sendInvoiceEmail } = await import("./email.server");
          await sendInvoiceEmail({
            to: String(clientRow[0].email),
            clientName: String(clientRow[0].full_name),
            clientCompany: String(clientRow[0].company),
            invoiceTitle: title,
            invoiceId: data.id,
            amount: computedAmount,
            status: status,
            dueDate: dueDate || undefined,
            notes: notes || undefined,
            lineItems,
          });
        }
      } catch (e) {
        console.error("Failed to send invoice email on update:", e);
      }
    }

    const finalRows = await sql`
      SELECT i.*, c.company as client_company, c.full_name as client_full_name, c.email as client_email
      FROM invoices i JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${data.id}
    `;
    return normalizeInvoice(finalRows[0] as Record<string, unknown>);
  });

export const sendInvoice = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      SELECT i.*, c.company as client_company, c.full_name as client_full_name, c.email as client_email
      FROM invoices i JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${data.id} AND i.owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Invoice not found");
    const inv = normalizeInvoice(rows[0] as Record<string, unknown>);

    if (!inv.clientEmail) throw new Error("Client has no email address");

    const { sendInvoiceEmail } = await import("./email.server");
    await sendInvoiceEmail({
      to: inv.clientEmail,
      clientName: inv.clientName ?? inv.clientCompany ?? "Client",
      clientCompany: inv.clientCompany ?? "",
      invoiceTitle: inv.title,
      invoiceId: inv.id,
      amount: inv.amount,
      status: inv.status,
      dueDate: inv.dueDate,
      notes: inv.notes,
      lineItems: inv.lineItems,
    });

    await sql`UPDATE invoices SET sent_at = NOW() WHERE id = ${data.id}`;

    try {
      const { createNotification } = await import("./notifications.server");
      await createNotification(
        context.userId,
        `Invoice "${inv.title}" sent to ${inv.clientEmail}`,
        `/invoices`,
      );
    } catch (e) {
      console.error("Failed to create sent notification:", e);
    }

    return { ok: true, sentTo: inv.clientEmail };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      DELETE FROM invoices
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING id, client_id, title
    `;
    if (rows.length === 0) throw new Error("Invoice not found");
    const deleted = rows[0];

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${deleted.client_id}, ${`Invoice "${deleted.title}" deleted`}, 'update')
    `;

    return { ok: true };
  });

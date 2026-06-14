import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireClerkAuth } from "./forms.functions";
import { sendAutomationEmail } from "./email.server";

// Types
export type CanvasNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  config?: Record<string, any>;
};

export type Connection = {
  id: string;
  from: string;
  to: string;
};

export type Automation = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: CanvasNode[];
  connections: Connection[];
  runs: number;
  lastRun: string | null;
};

function normalizeAutomation(row: Record<string, any>): Automation {
  let nodes: CanvasNode[] = [];
  let connections: Connection[] = [];
  try {
    nodes = typeof row.nodes === "string" ? JSON.parse(row.nodes) : (row.nodes ?? []);
  } catch (e) {
    console.error("Error parsing nodes for automation", row.id, e);
  }
  try {
    connections = typeof row.connections === "string" ? JSON.parse(row.connections) : (row.connections ?? []);
  } catch (e) {
    console.error("Error parsing connections for automation", row.id, e);
  }
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    enabled: Boolean(row.enabled),
    nodes,
    connections,
    runs: Number(row.runs ?? 0),
    lastRun: row.last_run ? new Date(row.last_run).toISOString() : null,
  };
}

const AutomationPayloadSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).default(""),
  enabled: z.boolean().default(false),
  nodes: z.array(z.any()).default([]),
  connections: z.array(z.any()).default([]),
});

const UpdateAutomationPayloadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  nodes: z.array(z.any()).optional(),
  connections: z.array(z.any()).optional(),
});

export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT * FROM automations
      WHERE owner_id = ${context.userId}::uuid
      ORDER BY updated_at DESC
    `;
    return rows.map(normalizeAutomation);
  });

export const createAutomation = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => AutomationPayloadSchema.parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      INSERT INTO automations (owner_id, name, description, enabled, nodes, connections)
      VALUES (
        ${context.userId}::uuid,
        ${data.name},
        ${data.description},
        ${data.enabled},
        ${JSON.stringify(data.nodes)}::jsonb,
        ${JSON.stringify(data.connections)}::jsonb
      )
      RETURNING *
    `;
    return normalizeAutomation(rows[0]);
  });

export const updateAutomation = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => UpdateAutomationPayloadSchema.parse(d))
  .handler(async ({ context, data }) => {
    const originals = await sql`
      SELECT * FROM automations
      WHERE id = ${data.id}::uuid AND owner_id = ${context.userId}::uuid
    `;
    if (originals.length === 0) {
      throw new Error("Automation not found");
    }
    const original = originals[0];
    const name = data.name !== undefined ? data.name : original.name;
    const description = data.description !== undefined ? data.description : original.description;
    const enabled = data.enabled !== undefined ? data.enabled : original.enabled;
    const nodes = data.nodes !== undefined ? JSON.stringify(data.nodes) : JSON.stringify(original.nodes);
    const connections = data.connections !== undefined ? JSON.stringify(data.connections) : JSON.stringify(original.connections);

    const rows = await sql`
      UPDATE automations
      SET
        name = ${name},
        description = ${description},
        enabled = ${enabled},
        nodes = ${nodes}::jsonb,
        connections = ${connections}::jsonb,
        updated_at = NOW()
      WHERE id = ${data.id}::uuid AND owner_id = ${context.userId}::uuid
      RETURNING *
    `;
    return normalizeAutomation(rows[0]);
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      DELETE FROM automations
      WHERE id = ${data.id}::uuid AND owner_id = ${context.userId}::uuid
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new Error("Automation not found");
    }
    return { ok: true };
  });

export const toggleAutomation = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      UPDATE automations
      SET enabled = NOT enabled, updated_at = NOW()
      WHERE id = ${data.id}::uuid AND owner_id = ${context.userId}::uuid
      RETURNING *
    `;
    if (rows.length === 0) {
      throw new Error("Automation not found");
    }
    return normalizeAutomation(rows[0]);
  });

// Engine Function (Direct call, not a Server Function)
export async function executeAutomationsForEvent(opts: {
  ownerId: string;
  trigger: string;
  payload: Record<string, any>;
}) {
  console.log(`[Automation Engine] Executing trigger "${opts.trigger}" for owner ${opts.ownerId}`);
  const rows = await sql`
    SELECT * FROM automations
    WHERE owner_id = ${opts.ownerId}::uuid AND enabled = true
  `;

  const automations = rows.map(normalizeAutomation);

  for (const auto of automations) {
    const triggers = auto.nodes.filter((n) => n.kind === opts.trigger);
    if (triggers.length === 0) continue;

    console.log(`[Automation Engine] Running automation: "${auto.name}" (ID: ${auto.id})`);
    let triggerExecuted = false;

    for (const triggerNode of triggers) {
      const visited = new Set<string>();
      const queue: string[] = [triggerNode.id];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = auto.nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        let shouldContinue = true;

        if (node.id !== triggerNode.id) {
          try {
            shouldContinue = await executeNode(node, opts.ownerId, opts.payload);
            triggerExecuted = true;
          } catch (err) {
            console.error(`[Automation Engine] Error executing node ${node.id} (${node.kind}):`, err);
            shouldContinue = false;
          }
        }

        if (shouldContinue) {
          const nextConnections = auto.connections.filter((c) => c.from === nodeId);
          for (const conn of nextConnections) {
            queue.push(conn.to);
          }
        }
      }
    }

    if (triggerExecuted) {
      await sql`
        UPDATE automations
        SET runs = runs + 1, last_run = NOW()
        WHERE id = ${auto.id}::uuid
      `;
    }
  }
}

async function executeNode(node: CanvasNode, ownerId: string, payload: Record<string, any>): Promise<boolean> {
  console.log(`[Automation Engine] Executing node: ${node.kind} (${node.id})`);

  if (node.kind === "condition_if") {
    const field = node.config?.field;
    const operator = node.config?.operator || "equals";
    const expectedValue = node.config?.value;
    const actualValue = resolveValue(field, payload);

    console.log(
      `[Automation Engine] Evaluating Condition: field=${field}, operator=${operator}, expected=${expectedValue}, actual=${actualValue}`
    );

    if (operator === "equals") {
      return String(actualValue).trim().toLowerCase() === String(expectedValue).trim().toLowerCase();
    }
    if (operator === "contains") {
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    }
    if (operator === "is not empty") {
      return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
    }
    if (operator === "is empty") {
      return actualValue === undefined || actualValue === null || String(actualValue).trim() === "";
    }
    return false;
  }

  if (node.kind === "action_send_email") {
    const to = template(node.config?.to || "{{client.email}}", payload);
    const subject = template(node.config?.subject || "Notification from Formline", payload);
    const body = template(node.config?.body || "Hi,\n\nThis is an automated message.", payload);

    if (!to || to.includes("{{")) {
      console.warn(`[Automation Engine] Skipping email action - recipient email "${to}" is invalid or unresolved.`);
      return true;
    }

    console.log(`[Automation Engine] Sending email to "${to}"`);
    await sendAutomationEmail({ to, subject, body });
    return true;
  }

  if (node.kind === "action_create_client") {
    const fullName = payload.submitterName || payload.clientName || payload.name || "New Client";
    const email = payload.submitterEmail || payload.clientEmail || payload.email || "no-email@example.com";
    const company = payload.company || payload.clientCompany || payload.companyName || "Unknown Company";

    console.log(`[Automation Engine] Creating new client: name=${fullName}, email=${email}, company=${company}`);

    const rows = await sql`
      INSERT INTO clients (owner_id, full_name, email, company, status)
      VALUES (${ownerId}::uuid, ${fullName}, ${email}, ${company}, 'New')
      RETURNING id
    `;

    if (rows.length > 0) {
      const clientId = rows[0].id;
      payload.clientId = clientId; // save to payload for downstream nodes
      payload.clientName = fullName;
      payload.clientEmail = email;
      payload.clientCompany = company;

      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${clientId}, 'Created via Automation', 'system')
      `;
    }
    return true;
  }

  if (node.kind === "action_update_status") {
    let clientId = payload.clientId;
    if (!clientId) {
      const email = payload.submitterEmail || payload.clientEmail || payload.email;
      if (email) {
        const matched = await sql`
          SELECT id FROM clients
          WHERE owner_id = ${ownerId}::uuid AND email = ${email}
          LIMIT 1
        `;
        if (matched.length > 0) {
          clientId = matched[0].id;
        }
      }
    }

    if (!clientId) {
      console.warn("[Automation Engine] Cannot update status - no client ID found or resolved in payload");
      return true;
    }

    const newStatus = node.config?.status || "In Progress";
    console.log(`[Automation Engine] Updating client status: clientId=${clientId}, newStatus=${newStatus}`);

    await sql`
      UPDATE clients
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${clientId}::uuid AND owner_id = ${ownerId}::uuid
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${clientId}::uuid, ${`Status updated to ${newStatus} via Automation`}, 'status')
    `;
    return true;
  }

  if (node.kind === "action_webhook") {
    const url = node.config?.url;
    const method = node.config?.method || "POST";
    const authToken = node.config?.authToken;

    if (!url) {
      console.warn("[Automation Engine] Webhook URL is not configured");
      return true;
    }

    console.log(`[Automation Engine] Sending webhook request: url=${url}, method=${method}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = authToken;
    }

    try {
      await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? JSON.stringify(payload) : undefined,
      });
    } catch (err) {
      console.error("[Automation Engine] Webhook fetch error:", err);
    }
    return true;
  }

  if (node.kind === "action_notify") {
    let clientId = payload.clientId;
    if (!clientId) {
      const email = payload.submitterEmail || payload.clientEmail || payload.email;
      if (email) {
        const matched = await sql`
          SELECT id FROM clients
          WHERE owner_id = ${ownerId}::uuid AND email = ${email}
          LIMIT 1
        `;
        if (matched.length > 0) {
          clientId = matched[0].id;
        }
      }
    }

    const message = template(node.config?.message || "Notification from automation workflow", payload);
    console.log(`[Automation Engine Notification] ${message}`, payload);

    if (clientId) {
      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${clientId}::uuid, ${message}, 'update')
      `;
    }
    return true;
  }

  return true;
}

function resolveValue(path: string | undefined, payload: any): any {
  if (!path) return undefined;
  const p = path.toLowerCase().trim();
  if (p === "client.status" || p === "status" || p === "newstatus") {
    return payload.newStatus ?? payload.status ?? payload.clientStatus;
  }
  if (p === "client.email" || p === "submission.email" || p === "email" || p === "submitteremail") {
    return payload.submitterEmail ?? payload.clientEmail ?? payload.email;
  }
  if (p === "client.name" || p === "submission.name" || p === "name" || p === "submittername") {
    return payload.submitterName ?? payload.clientName ?? payload.name;
  }
  if (p === "client.industry" || p === "industry") {
    return payload.clientIndustry ?? payload.industry;
  }

  const parts = path.split(".");
  let cur = payload;
  for (const part of parts) {
    if (cur && typeof cur === "object") {
      cur = cur[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function template(str: string, payload: any): string {
  if (!str) return "";
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const val = resolveValue(path.trim(), payload);
    return val !== undefined && val !== null ? String(val) : match;
  });
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireClerkAuth } from "./forms.functions";

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

export function normalizeAutomation(row: Record<string, any>): Automation {
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


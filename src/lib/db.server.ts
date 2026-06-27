import { neon } from "@neondatabase/serverless";

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing DATABASE_URL environment variable");
    }
    sqlClient = neon(url);
  }
  return sqlClient;
}

/** Tagged-template SQL client — server-only (.server.ts). */
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...values)) as unknown as <T extends Record<string, any> = Record<string, any>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

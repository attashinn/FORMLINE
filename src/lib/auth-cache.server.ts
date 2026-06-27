import crypto from "node:crypto";

type MemoryEntry = { value: string; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();

function pruneMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function hasUpstashConfig(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand<T = unknown>(command: unknown[]): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    console.warn("[auth-cache] Upstash request failed:", response.status);
    return null;
  }

  const payload = (await response.json()) as { result?: T };
  return payload.result ?? null;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (hasUpstashConfig()) {
    const value = await upstashCommand<string | null>(["GET", key]);
    return value ?? null;
  }

  pruneMemory();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (hasUpstashConfig()) {
    await upstashCommand(["SET", key, value, "EX", ttlSeconds]);
    return;
  }

  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  if (hasUpstashConfig()) {
    await upstashCommand(["DEL", key]);
    return;
  }

  memoryStore.delete(key);
}

/** Increment a counter and refresh its TTL. Returns the new count. */
export async function cacheIncr(key: string, ttlSeconds: number): Promise<number> {
  if (hasUpstashConfig()) {
    const count = Number((await upstashCommand<number>(["INCR", key])) ?? 0);
    await upstashCommand(["EXPIRE", key, ttlSeconds]);
    return count;
  }

  pruneMemory();
  const entry = memoryStore.get(key);
  const next = entry && entry.expiresAt > Date.now() ? Number(entry.value) + 1 : 1;
  memoryStore.set(key, { value: String(next), expiresAt: Date.now() + ttlSeconds * 1000 });
  return next;
}

export async function cacheSetNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  if (hasUpstashConfig()) {
    const result = await upstashCommand<string | null>(["SET", key, value, "NX", "EX", ttlSeconds]);
    return result === "OK";
  }

  pruneMemory();
  if (memoryStore.has(key) && (memoryStore.get(key)?.expiresAt ?? 0) > Date.now()) {
    return false;
  }

  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}

export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24);
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

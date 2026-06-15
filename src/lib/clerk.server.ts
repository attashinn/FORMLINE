import { clerkClient } from "@clerk/tanstack-react-start/server";
import { sql } from "@/lib/db.server";
import { getDeterministicUuid } from "@/lib/owner-id";

export type OwnerProfile = {
  ownerId: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
};

async function upsertOwnerProfile(profile: OwnerProfile) {
  await sql`
    INSERT INTO owners (owner_id, clerk_user_id, email, first_name, updated_at)
    VALUES (
      ${profile.ownerId}::uuid,
      ${profile.clerkUserId},
      ${profile.email},
      ${profile.firstName},
      NOW()
    )
    ON CONFLICT (owner_id) DO UPDATE SET
      clerk_user_id = EXCLUDED.clerk_user_id,
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      updated_at = NOW()
  `;
}

async function readOwnerFromDb(ownerId: string): Promise<OwnerProfile | null> {
  const rows = await sql`
    SELECT owner_id, clerk_user_id, email, first_name
    FROM owners
    WHERE owner_id = ${ownerId}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ownerId: String(row.owner_id),
    clerkUserId: String(row.clerk_user_id),
    email: String(row.email),
    firstName: row.first_name ? String(row.first_name) : null,
  };
}

/** Paginated Clerk scan — fallback when owners cache is cold. */
async function findOwnerInClerkByUuid(ownerId: string): Promise<OwnerProfile | null> {
  const limit = 100;
  let offset = 0;

  while (true) {
    const result = await clerkClient().users.getUserList({ limit, offset });
    const users = Array.isArray(result) ? result : result.data ?? [];

    for (const user of users) {
      if (getDeterministicUuid(user.id) !== ownerId) continue;
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) return null;

      const profile: OwnerProfile = {
        ownerId,
        clerkUserId: user.id,
        email,
        firstName: user.firstName ?? null,
      };
      await upsertOwnerProfile(profile);
      return profile;
    }

    if (users.length < limit) break;
    offset += limit;
  }

  return null;
}

/** Resolve owner email (and name) by mapped owner UUID. DB cache first, Clerk fallback. */
export async function getOwnerProfileByUuid(ownerId: string): Promise<OwnerProfile | null> {
  const cached = await readOwnerFromDb(ownerId);
  if (cached?.email) return cached;
  return findOwnerInClerkByUuid(ownerId);
}

export async function getOwnerEmailByUuid(ownerId: string): Promise<string | null> {
  const profile = await getOwnerProfileByUuid(ownerId);
  return profile?.email ?? null;
}

/** Upsert owners row from the authenticated Clerk session (called on each authed request). */
export async function syncOwnerProfileFromClerk(opts: {
  clerkUserId: string;
  ownerId: string;
}) {
  try {
    const user = await clerkClient().users.getUser(opts.clerkUserId);
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      console.warn(`[owners] Clerk user ${opts.clerkUserId} has no primary email to cache`);
      return;
    }

    await upsertOwnerProfile({
      ownerId: opts.ownerId,
      clerkUserId: opts.clerkUserId,
      email,
      firstName: user.firstName ?? null,
    });
  } catch (err) {
    console.warn("[owners] Failed to sync owner profile from Clerk:", err);
  }
}

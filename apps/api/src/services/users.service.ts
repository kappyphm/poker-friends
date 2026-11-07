import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';

export async function getUserById(id: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return rows[0] ?? null;
}

export async function findOrCreateUser(opts: { googleId?: string; email: string; name: string; avatarUrl?: string | null }) {
  if (opts.googleId) {
    const existing = await db.select().from(schema.users).where(eq(schema.users.googleId, opts.googleId));
    if (existing[0]) return existing[0];
  }
  const byEmail = await db.select().from(schema.users).where(eq(schema.users.email, opts.email));
  if (byEmail[0]) return byEmail[0];
  const inserted = await db.insert(schema.users).values({
    googleId: opts.googleId ?? null,
    email: opts.email,
    name: opts.name,
    avatarUrl: opts.avatarUrl ?? null,
  }).returning();
  return inserted[0];
}

export type UserRow = NonNullable<Awaited<ReturnType<typeof getUserById>>>;

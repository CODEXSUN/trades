import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { hashPassword } from "../../auth/password-hash.js";
import type { TenantDatabase } from "../../database/schema.js";
import { env } from "../../env.js";

export async function seedTenantUserModule(database: Kysely<TenantDatabase>) {
  const email = (env.CLIENT_ADMIN_EMAIL || env.CLIENT_ADMIN_EMAIL).trim().toLowerCase();
  const password = (env.CLIENT_ADMIN_PASSWORD || env.CLIENT_ADMIN_PASSWORD).trim();
  if (!email || !password) return;
  await database
    .insertInto("users")
    .values({
      email,
      name: (env.CLIENT_ADMIN_NAME || env.CLIENT_ADMIN_NAME).trim() || email,
      password_hash: hashPassword(password),
      role: "admin",
      status: "active",
      uuid: stable(email),
      is_protected: true
    })
    .onDuplicateKeyUpdate({
      name: (env.CLIENT_ADMIN_NAME || env.CLIENT_ADMIN_NAME).trim() || email,
      password_hash: hashPassword(password),
      role: "admin",
      status: "active",
      is_protected: true
    })
    .execute();
}
function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

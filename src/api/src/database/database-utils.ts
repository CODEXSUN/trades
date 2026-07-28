import { sql, type Kysely } from "kysely";

export function quoteTradesIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_]+$/u.test(value)) {
    throw new Error(`Invalid Trades database identifier: ${value}`);
  }
  return `\`${value}\``;
}

export async function renameLegacyTradesTable<Database>(
  database: Kysely<Database>,
  legacyName: string,
  ownedName: string
) {
  if (!(await tableExists(database, legacyName))) return;
  if (await tableExists(database, ownedName)) {
    throw new Error(
      `Cannot rename legacy Trades table ${legacyName}: ${ownedName} already exists.`
    );
  }
  await sql
    .raw(`RENAME TABLE ${quoteTradesIdentifier(legacyName)} TO ${quoteTradesIdentifier(ownedName)}`)
    .execute(database);
}

export async function tableExists<Database>(database: Kysely<Database>, tableName: string) {
  const result = await sql<{ count: number | string }>`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
  `.execute(database);
  return Number(result.rows[0]?.count ?? 0) > 0;
}

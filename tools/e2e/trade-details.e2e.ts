import assert from "node:assert/strict";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { createApp } from "../../src/platform/api/src/app.js";
import { signAuthToken } from "../../src/platform/api/src/auth/jwt.js";
import { env } from "../../src/platform/api/src/env.js";

type TenantRow = RowDataPacket & {
  db_name: string;
  tenant_code: string;
  uuid: string;
};
type TransactionRecord = {
  amount: number;
  id: number;
  reference: string;
  status: "active" | "inactive";
  uuid: string;
};

const run = Date.now().toString(36);
const app = await createApp();
const connection = await createConnection({
  database: env.TRADES_DB_NAME,
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});

try {
  const [tenants] = await connection.query<TenantRow[]>(
    "SELECT uuid,tenant_code,db_name FROM tenants WHERE tenant_code='TRADES' AND status='active' LIMIT 1"
  );
  const tenant = tenants[0];
  assert.ok(tenant, "The fixed Trades client was not seeded.");
  await connection.changeUser({ database: tenant.db_name });
  const token = await adminToken(tenant);

  const depositReference = `DEP-${run}`;
  const paymentReference = `PAY-${run}`;
  let deposit: TransactionRecord | null = null;
  let payment: TransactionRecord | null = null;

  try {
    deposit = await createTransaction(token, tenant, "deposits", {
      amount: 10_000,
      bank: "E2E Deposit Bank",
      date: "2026-07-23",
      name: "E2E Deposit Account",
      reference: depositReference,
      status: "active",
      tgCode: `TG-D-${run}`
    });
    assert.equal(deposit.uuid.length, 8);

    const duplicateDeposit = await request(token, tenant, "POST", "/trades/deposits", {
      amount: 1_000,
      bank: "Duplicate Bank",
      date: "2026-07-23",
      name: "Duplicate Deposit",
      reference: depositReference,
      status: "active",
      tgCode: `TG-DUP-${run}`
    });
    assert.equal(duplicateDeposit.statusCode, 409, "Duplicate deposit reference was accepted.");

    const listedDeposits = await request(
      token,
      tenant,
      "GET",
      `/trades/deposits?search=${encodeURIComponent(depositReference)}`
    );
    assert.equal(listedDeposits.statusCode, 200);
    assert.equal((listedDeposits.data as TransactionRecord[]).length, 1);

    const updatedDeposit = await request(token, tenant, "PUT", `/trades/deposits/${deposit.id}`, {
      amount: 20_000,
      bank: "E2E Deposit Bank",
      date: "2026-07-24",
      name: "E2E Deposit Account Updated",
      reference: depositReference,
      status: "active",
      tgCode: `TG-D-${run}`
    });
    assert.equal(updatedDeposit.statusCode, 200);
    deposit = updatedDeposit.data as TransactionRecord;
    await verifyLifecycle(token, tenant, "deposits", deposit);

    payment = await createTransaction(token, tenant, "payments", {
      amount: 5_000,
      bank: "E2E Payment Bank",
      date: "2026-07-23",
      name: "E2E Payment Account",
      reference: paymentReference,
      status: "active",
      tgCode: `TG-P-${run}`
    });
    assert.equal(payment.uuid.length, 8);
    await verifyLifecycle(token, tenant, "payments", payment);

    const [depositLinks] = await connection.query<
      Array<RowDataPacket & { amountTotal: number; count: number; percentageTotal: number }>
    >(
      "SELECT COUNT(*) count,SUM(amount_1+amount_2+amount_3) amountTotal,SUM(percentage_1+percentage_2+percentage_3) percentageTotal FROM deposit_commissions WHERE deposit_id=?",
      [deposit.id]
    );
    const [paymentLinks] = await connection.query<
      Array<RowDataPacket & { amountTotal: number; count: number; percentageTotal: number }>
    >(
      "SELECT COUNT(*) count,SUM(amount_1+amount_2+amount_3) amountTotal,SUM(percentage_1+percentage_2+percentage_3) percentageTotal FROM payment_commissions WHERE payment_id=?",
      [payment.id]
    );
    assert.equal(Number(depositLinks[0]?.count), 1, "Deposit commission row was not linked.");
    assert.equal(Number(paymentLinks[0]?.count), 1, "Payment commission row was not linked.");
    assert.equal(Number(depositLinks[0]?.amountTotal), 0);
    assert.equal(Number(depositLinks[0]?.percentageTotal), 0);
    assert.equal(Number(paymentLinks[0]?.amountTotal), 0);
    assert.equal(Number(paymentLinks[0]?.percentageTotal), 0);

    const [activity] = await connection.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) count FROM platform_activity WHERE module_key IN ('trades.deposit','trades.payment') AND record_uuid IN (?,?)",
      [deposit.uuid, payment.uuid]
    );
    assert.ok(Number(activity[0]?.count) >= 6, "Trade transaction lifecycle was not audited.");
  } finally {
    if (deposit) await forceDelete(token, tenant, "deposits", deposit.id);
    if (payment) await forceDelete(token, tenant, "payments", payment.id);
  }

  const [remainingDepositCommission] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >(
    "SELECT COUNT(*) count FROM deposit_commissions commission INNER JOIN deposits deposit ON deposit.id=commission.deposit_id WHERE deposit.reference=?",
    [depositReference]
  );
  const [remainingPaymentCommission] = await connection.query<
    Array<RowDataPacket & { count: number }>
  >(
    "SELECT COUNT(*) count FROM payment_commissions commission INNER JOIN payments payment ON payment.id=commission.payment_id WHERE payment.reference=?",
    [paymentReference]
  );
  assert.equal(Number(remainingDepositCommission[0]?.count), 0);
  assert.equal(Number(remainingPaymentCommission[0]?.count), 0);

  console.log("Trade details E2E passed", {
    commissionTables: ["deposit_commissions", "payment_commissions"],
    transactionTables: ["deposits", "payments"]
  });
} finally {
  await app.close();
  await connection.end();
}

async function adminToken(tenant: TenantRow) {
  const [users] = await connection.query<Array<RowDataPacket & { email: string; uuid: string }>>(
    "SELECT email,uuid FROM users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1"
  );
  const admin = users[0];
  assert.ok(admin, "Trades administrator was not seeded.");
  return signAuthToken({
    email: admin.email,
    tenantCode: tenant.tenant_code,
    tenantDbName: tenant.db_name,
    tenantId: tenant.uuid,
    tenantUuid: tenant.uuid,
    userId: admin.uuid,
    userType: "tenant"
  });
}

async function createTransaction(
  token: string,
  tenant: TenantRow,
  resource: "deposits" | "payments",
  payload: unknown
) {
  const response = await request(token, tenant, "POST", `/trades/${resource}`, payload);
  assert.equal(response.statusCode, 200, `${resource} create failed: ${response.error ?? ""}`);
  return response.data as TransactionRecord;
}

async function verifyLifecycle(
  token: string,
  tenant: TenantRow,
  resource: "deposits" | "payments",
  record: TransactionRecord
) {
  const suspended = await request(
    token,
    tenant,
    "POST",
    `/trades/${resource}/${record.id}/deactivate`
  );
  assert.equal(suspended.statusCode, 200);
  assert.equal((suspended.data as TransactionRecord).status, "inactive");
  const restored = await request(
    token,
    tenant,
    "POST",
    `/trades/${resource}/${record.id}/activate`
  );
  assert.equal(restored.statusCode, 200);
  assert.equal((restored.data as TransactionRecord).status, "active");
}

async function forceDelete(
  token: string,
  tenant: TenantRow,
  resource: "deposits" | "payments",
  id: number
) {
  const response = await request(token, tenant, "DELETE", `/trades/${resource}/${id}/force`);
  assert.equal(response.statusCode, 200, `${resource} cleanup failed.`);
}

async function request(
  token: string,
  tenant: TenantRow,
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown
) {
  const response = await app.inject({
    headers: {
      authorization: `Bearer ${token}`,
      "x-tenant-db": tenant.db_name,
      "x-tenant-id": tenant.uuid
    },
    method,
    ...(payload === undefined ? {} : { payload }),
    url
  });
  const envelope = response.json() as {
    data?: unknown;
    error?: { message?: string };
  };
  return {
    data: envelope.data,
    error: envelope.error?.message,
    statusCode: response.statusCode
  };
}

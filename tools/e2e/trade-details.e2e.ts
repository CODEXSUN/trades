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
type StatementRecord = {
  entries: Array<{
    direction: "credit" | "debit";
    entryType: string;
    id: number;
    reconciledAt: string | null;
  }>;
  summary: {
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    unreconciledCount: number;
  };
};
type CommissionListRecord = {
  entries: Array<{
    amount: number;
    id: number;
    lines: Array<{ amount: number; percentage: number }>;
    reference: string;
    totalCommission: number;
  }>;
  variants: Array<{ percentage: number }>;
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
  let bankAccount: TransactionRecord | null = null;
  let transferBankAccount: TransactionRecord | null = null;

  try {
    bankAccount = await createTransaction(token, tenant, "bank-accounts", {
      accountName: "E2E Trade Account",
      bankName: "E2E Bank",
      branch: "Test Branch",
      code: `E2E-${run}`.slice(0, 40),
      ifsc: "E2E00000001",
      openingBalance: 0,
      status: "active"
    });
    transferBankAccount = await createTransaction(token, tenant, "bank-accounts", {
      accountName: "E2E Transfer Account",
      bankName: "E2E Bank Two",
      branch: "Transfer Branch",
      code: `E2T-${run}`.slice(0, 40),
      ifsc: "E2E00000002",
      openingBalance: 1_000,
      status: "active"
    });
    deposit = await createTransaction(token, tenant, "deposits", {
      amount: 10_000,
      bankAccountId: bankAccount.id,
      date: "2026-07-23",
      name: "E2E Deposit Account",
      reference: depositReference,
      status: "active",
      tgCode: `TG-D-${run}`
    });
    assert.equal(deposit.uuid.length, 8);

    const duplicateDeposit = await request(token, tenant, "POST", "/trades/deposits", {
      amount: 1_000,
      bankAccountId: bankAccount.id,
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
      bankAccountId: bankAccount.id,
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
      bankAccountId: bankAccount.id,
      date: "2026-07-23",
      name: "E2E Payment Account",
      reference: paymentReference,
      status: "active",
      tgCode: `TG-P-${run}`
    });
    assert.equal(payment.uuid.length, 8);
    await verifyLifecycle(token, tenant, "payments", payment);

    const cashEntry = await request(
      token,
      tenant,
      "POST",
      `/trades/bank-accounts/${bankAccount.id}/entries`,
      {
        amount: 500,
        date: "2026-07-24",
        entryType: "cash_deposit",
        narration: "E2E cash",
        reference: `CASH-${run}`
      }
    );
    assert.equal(cashEntry.statusCode, 200, "Cash deposit entry failed.");
    const transfer = await request(token, tenant, "POST", "/trades/bank-accounts/transfer", {
      amount: 200,
      date: "2026-07-24",
      fromBankAccountId: bankAccount.id,
      narration: "E2E transfer",
      reference: `TRF-${run}`,
      toBankAccountId: transferBankAccount.id
    });
    assert.equal(transfer.statusCode, 200, "Bank transfer failed.");
    const statementResponse = await request(
      token,
      tenant,
      "GET",
      `/trades/bank-accounts/${bankAccount.id}/statement`
    );
    assert.equal(statementResponse.statusCode, 200);
    const statement = statementResponse.data as StatementRecord;
    assert.equal(statement.summary.closingBalance, 15_300);
    assert.ok(
      statement.entries.some(
        (entry) => entry.entryType === "deposit" && entry.direction === "debit"
      )
    );
    assert.ok(
      statement.entries.some(
        (entry) => entry.entryType === "payment" && entry.direction === "credit"
      )
    );
    assert.ok(
      statement.entries.some(
        (entry) => entry.entryType === "transfer_out" && entry.direction === "credit"
      )
    );
    const depositEntry = statement.entries.find((entry) => entry.entryType === "deposit");
    assert.ok(depositEntry);
    const reconciled = await request(
      token,
      tenant,
      "POST",
      `/trades/bank-accounts/entries/${depositEntry.id}/reconcile`
    );
    assert.equal(reconciled.statusCode, 200, "Bank reconciliation failed.");
    const blockedDelete = await request(
      token,
      tenant,
      "DELETE",
      `/trades/bank-accounts/${bankAccount.id}/force`
    );
    assert.equal(blockedDelete.statusCode, 409, "Bank account with statement entries was deleted.");

    const depositCommissions = await request(
      token,
      tenant,
      "GET",
      "/trades/commissions/deposits?dateFrom=2026-07-01&dateTo=2026-07-31"
    );
    assert.equal(depositCommissions.statusCode, 200);
    const depositCommission = (depositCommissions.data as CommissionListRecord).entries.find(
      (entry) => entry.reference === depositReference
    );
    assert.ok(depositCommission, "Deposit commission entry was not linked.");
    assert.equal(depositCommission.amount, 20_000);
    assert.deepEqual(
      depositCommission.lines.map((line) => line.percentage),
      [1, 2, 3]
    );
    assert.equal(depositCommission.totalCommission, 1_200);

    const withdrawalCommissions = await request(
      token,
      tenant,
      "GET",
      "/trades/commissions/withdrawals?dateFrom=2026-07-01&dateTo=2026-07-31"
    );
    assert.equal(withdrawalCommissions.statusCode, 200);
    const withdrawalCommission = (withdrawalCommissions.data as CommissionListRecord).entries.find(
      (entry) => entry.reference === paymentReference
    );
    assert.ok(withdrawalCommission, "Withdrawal commission entry was not linked.");
    assert.equal(withdrawalCommission.amount, 5_000);
    assert.equal(withdrawalCommission.totalCommission, 300);

    const settledDeposit = await request(
      token,
      tenant,
      "POST",
      `/trades/commissions/deposits/${depositCommission.id}/settle`
    );
    assert.equal(settledDeposit.statusCode, 200, "Deposit commission settlement failed.");
    const settledWithdrawal = await request(
      token,
      tenant,
      "POST",
      `/trades/commissions/withdrawals/${withdrawalCommission.id}/settle`
    );
    assert.equal(settledWithdrawal.statusCode, 200, "Withdrawal commission settlement failed.");
    const hiddenSettled = await request(token, tenant, "GET", "/trades/commissions/deposits");
    assert.ok(
      !(hiddenSettled.data as CommissionListRecord).entries.some(
        (entry) => entry.reference === depositReference
      ),
      "Settled deposit commission remained in the unsettled list."
    );

    const [activity] = await connection.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) count FROM platform_activity WHERE module_key IN ('trades.deposit','trades.payment','trades.commission')"
    );
    assert.ok(Number(activity[0]?.count) >= 6, "Trade transaction lifecycle was not audited.");
  } finally {
    if (deposit) await forceDelete(token, tenant, "deposits", deposit.id);
    if (payment) await forceDelete(token, tenant, "payments", payment.id);
    const cleanupBankIds = [bankAccount?.id, transferBankAccount?.id].filter((id): id is number =>
      Boolean(id)
    );
    if (cleanupBankIds.length) {
      await connection.query("DELETE FROM bank_ledger_entries WHERE bank_account_id IN (?)", [
        cleanupBankIds
      ]);
    }
    if (bankAccount) await forceDelete(token, tenant, "bank-accounts", bankAccount.id);
    if (transferBankAccount)
      await forceDelete(token, tenant, "bank-accounts", transferBankAccount.id);
  }

  const [remainingCommission] = await connection.query<Array<RowDataPacket & { count: number }>>(
    "SELECT COUNT(*) count FROM commission_entries WHERE reference IN (?,?)",
    [depositReference, paymentReference]
  );
  assert.equal(Number(remainingCommission[0]?.count), 0);

  console.log("Trade details E2E passed", {
    commissionTables: ["commission_variants", "commission_entries", "commission_entry_lines"],
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
  resource: "bank-accounts" | "deposits" | "payments",
  payload: unknown
) {
  const response = await request(token, tenant, "POST", `/trades/${resource}`, payload);
  assert.equal(response.statusCode, 200, `${resource} create failed: ${response.error ?? ""}`);
  return response.data as TransactionRecord;
}

async function verifyLifecycle(
  token: string,
  tenant: TenantRow,
  resource: "bank-accounts" | "deposits" | "payments",
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

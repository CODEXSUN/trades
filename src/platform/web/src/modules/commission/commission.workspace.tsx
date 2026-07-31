import { useState } from "react";
import { Printer, RefreshCw, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Button,
  WorkspaceDatePicker,
  WorkspaceFormField,
  WorkspacePage,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui";
import { CommissionForm } from "./commission.form";
import { TradesFormBanner } from "../../shared/form-banner";
import { commissionQueryKey, useCommissions } from "./commission.hooks";
import { CommissionList } from "./commission.list";
import { printCommissionReport } from "./commission.print";
import { settleCommission, updateCommissionVariant, verifyCommission } from "./commission.services";
import type {
  CommissionDirection,
  CommissionEntryRecord,
  CommissionLifecycleFilter,
  CommissionVariantSavePayload
} from "./commission.types";

type CommissionAction = { record: CommissionEntryRecord; type: "settle" | "verify" };

export function CommissionWorkspace({ direction }: { direction: CommissionDirection }) {
  const client = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lifecycle, setLifecycle] = useState<CommissionLifecycleFilter>("open");
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState<CommissionAction | null>(null);
  const query = useCommissions(direction, {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    lifecycle
  });
  const refresh = () => client.invalidateQueries({ queryKey: commissionQueryKey });
  const settle = useMutation({
    mutationFn: (action: CommissionAction) =>
      action.type === "verify"
        ? verifyCommission(direction, action.record.id)
        : settleCommission(direction, action.record.id),
    onSuccess: async (record, action) => {
      await refresh();
      setPending(null);
      toast.success(action.type === "verify" ? "Commission verified" : "Commission settled", {
        description:
          action.type === "verify"
            ? `${record.reference ?? record.tgCode} can now be settled.`
            : `${record.reference ?? record.tgCode} was removed from the default Open list.`
      });
    },
    onError: notify("Unable to update commission lifecycle")
  });
  const save = useMutation({
    mutationFn: (values: Array<{ id: number; payload: CommissionVariantSavePayload }>) =>
      Promise.all(values.map((value) => updateCommissionVariant(value.id, value.payload))),
    onSuccess: async () => {
      await refresh();
      setSettings(false);
      toast.success("Commission rates updated");
    },
    onError: notify("Unable to update commission rates")
  });
  const title = direction === "deposit" ? "Deposit Commission" : "Withdrawal Commission";
  const data = query.data;
  return (
    <WorkspacePage
      actions={
        <div className="flex gap-2">
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            variant="outline"
          >
            <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            disabled={!data || data.entries.length === 0}
            onClick={() => data && printCommissionReport(data)}
            variant="outline"
          >
            <Printer className="size-4" />
            Print PDF
          </Button>
          <Button onClick={() => setSettings(true)} variant="outline">
            <Settings2 className="size-4" />
            Commission rates
          </Button>
        </div>
      }
      description={`Confirm ${direction === "deposit" ? "incoming deposit" : "outgoing withdrawal"} commissions. Settled rows leave the default Open list.`}
      technicalName={`page.trades.commission.${direction}`}
      title={title}
    >
      <div className="grid gap-3 rounded-md border border-border/70 bg-card p-4 md:grid-cols-3">
        <WorkspaceFormField label="From date">
          <WorkspaceDatePicker value={dateFrom} onValueChange={setDateFrom} />
        </WorkspaceFormField>
        <WorkspaceFormField label="To date">
          <WorkspaceDatePicker value={dateTo} onValueChange={setDateTo} />
        </WorkspaceFormField>
        <WorkspaceFormField label="Lifecycle">
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            onChange={(event) => setLifecycle(event.target.value as CommissionLifecycleFilter)}
            value={lifecycle}
          >
            <option value="open">Open</option>
            <option value="unverified">Not verified</option>
            <option value="verified">Verified</option>
            <option value="settled">Settled</option>
            <option value="all">All entries</option>
          </select>
        </WorkspaceFormField>
      </div>
      {query.error instanceof Error ? (
        <TradesFormBanner title="Unable to load commissions">
          {query.error.message}
        </TradesFormBanner>
      ) : null}
      <CommissionList
        loading={query.isFetching && !data}
        onSettle={(record) => setPending({ record, type: "settle" })}
        onVerify={(record) => setPending({ record, type: "verify" })}
        pendingId={settle.isPending ? (pending?.record.id ?? null) : null}
        records={data?.entries ?? []}
        settlingId={settle.isPending && pending?.type === "settle" ? pending.record.id : null}
        variants={(data?.variants ?? []).filter((v) => v.status === "active")}
      />
      <div className="grid gap-2 rounded-md border border-border/70 bg-card px-4 py-3 md:grid-cols-4">
        <Total label="Amount total" value={data?.totals.amount ?? 0} />
        {(data?.variants ?? [])
          .filter((v) => v.status === "active")
          .map((v) => (
            <Total
              key={v.id}
              label={`${v.name} total`}
              value={data?.totals.variants.find((total) => total.variantId === v.id)?.amount ?? 0}
            />
          ))}
        <Total label="Commission total" strong value={data?.totals.commission ?? 0} />
      </div>
      <CommissionForm
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        loading={save.isPending}
        onCancel={() => setSettings(false)}
        onSubmit={(values) => save.mutate(values)}
        open={settings}
        variants={data?.variants ?? []}
      />
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "verify" ? "Verify this commission?" : "Settle this commission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? pending.type === "verify"
                  ? `${pending.record.reference ?? pending.record.tgCode} will be marked verified and can then be settled.`
                  : `${pending.record.reference ?? pending.record.tgCode} will be settled and hidden from the default Open ${direction} list.`
                : "Confirm this entry."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settle.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={settle.isPending}
              onClick={() => pending && settle.mutate(pending)}
            >
              {pending?.type === "verify" ? "Verify" : "Settle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
function Total({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "font-medium tabular-nums"}>
        {new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value)}
      </span>
    </div>
  );
}
function notify(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}

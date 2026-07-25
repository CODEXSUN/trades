import { useState } from "react";
import { Printer, RefreshCw, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@codexsun/ui/components/sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceDatePicker } from "@codexsun/ui";
import { WorkspaceFormBanner, WorkspaceFormField } from "@codexsun/ui/workspace/upsert";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui/components/alert-dialog";
import { CommissionForm } from "./commission.form";
import { commissionQueryKey, useCommissions } from "./commission.hooks";
import { CommissionList } from "./commission.list";
import { printCommissionReport } from "./commission.print";
import { settleCommission, updateCommissionVariant } from "./commission.services";
import type {
  CommissionDirection,
  CommissionEntryRecord,
  CommissionVariantSavePayload
} from "./commission.types";

export function CommissionWorkspace({ direction }: { direction: CommissionDirection }) {
  const client = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState<CommissionEntryRecord | null>(null);
  const query = useCommissions(direction, {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  });
  const refresh = () => client.invalidateQueries({ queryKey: commissionQueryKey });
  const settle = useMutation({
    mutationFn: (record: CommissionEntryRecord) => settleCommission(direction, record.id),
    onSuccess: async (record) => {
      await refresh();
      setPending(null);
      toast.success("Commission settled", {
        description: `${record.reference} was confirmed and removed from the unsettled list.`
      });
    },
    onError: notify("Unable to settle commission")
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
      description={`Confirm ${direction === "deposit" ? "incoming deposit" : "outgoing withdrawal"} commissions. Settled rows leave this list automatically.`}
      technicalName={`page.trades.commission.${direction}`}
      title={title}
    >
      <div className="grid gap-3 rounded-md border border-border/70 bg-card p-4 md:grid-cols-2">
        <WorkspaceFormField label="From date">
          <WorkspaceDatePicker value={dateFrom} onValueChange={setDateFrom} />
        </WorkspaceFormField>
        <WorkspaceFormField label="To date">
          <WorkspaceDatePicker value={dateTo} onValueChange={setDateTo} />
        </WorkspaceFormField>
      </div>
      {query.error instanceof Error ? (
        <WorkspaceFormBanner title="Unable to load commissions">
          {query.error.message}
        </WorkspaceFormBanner>
      ) : null}
      <CommissionList
        loading={query.isFetching && !data}
        onSettle={setPending}
        records={data?.entries ?? []}
        settlingId={settle.isPending ? (pending?.id ?? null) : null}
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
            <AlertDialogTitle>Settle this commission?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.reference} will be confirmed and hidden from the unsettled ${direction} list.`
                : "Confirm this entry."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settle.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={settle.isPending}
              onClick={() => pending && settle.mutate(pending)}
            >
              Settle
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

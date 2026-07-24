import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "@codexsun/ui/components/sonner";
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
import { Button } from "@codexsun/ui/components/button";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { PaymentForm } from "./payment.form";
import { paymentQueryKey, usePayments } from "./payment.hooks";
import { PaymentList } from "./payment.list";
import {
  activatePayment,
  createPayment,
  deactivatePayment,
  forceDeletePayment,
  updatePayment
} from "./payment.services";
import type { PaymentRecord, PaymentSavePayload } from "./payment.types";

type PaymentAction = {
  record: PaymentRecord;
  type: "force-delete" | "restore" | "suspend";
};

export function PaymentWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState<PaymentRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PaymentAction | null>(null);
  const paymentsQuery = usePayments();

  const saveMutation = useMutation({
    mutationFn: (payload: PaymentSavePayload) =>
      editing ? updatePayment(editing.id, payload) : createPayment(payload),
    onError: showPaymentError("Unable to save payment"),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success(`Payment ${editing ? "updated" : "created"}`, {
        description: `${record.reference} is ready in the list.`
      });
      setEditing(undefined);
    }
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PaymentAction) => {
      switch (type) {
        case "force-delete":
          return forceDeletePayment(record.id);
        case "restore":
          return activatePayment(record.id);
        default:
          return deactivatePayment(record.id);
      }
    },
    onError: showPaymentError("Unable to update payment"),
    onSuccess: async (record, action) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success(paymentActionMessage(action.type), { description: record.reference });
      setPendingAction(null);
    }
  });

  const matchingPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (paymentsQuery.data ?? []).filter((payment) => {
      if (status !== "all" && payment.status !== status) return false;
      return (
        !term ||
        [payment.tgCode, payment.bank, payment.name, payment.reference].some((value) =>
          value.toLowerCase().includes(term)
        )
      );
    });
  }, [paymentsQuery.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(matchingPayments.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = matchingPayments.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const pageTotals = useMemo(
    () => ({
      active: visiblePayments.filter((record) => record.status === "active").length,
      amount: visiblePayments.reduce((total, record) => total + record.amount, 0)
    }),
    [visiblePayments]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={paymentsQuery.isFetching}
            onClick={() => void paymentsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", paymentsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New payment
          </Button>
        </div>
      }
      description="Post and maintain outgoing payment transactions."
      technicalName="page.trades.payment.list"
      title="Payments"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All payments" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
        filterValue={status}
        onFilterValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search payments"
        searchValue={search}
      />
      <PaymentList
        loading={paymentsQuery.isFetching && !paymentsQuery.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={visiblePayments}
      />
      <PaymentPageTotals
        active={pageTotals.active}
        amount={pageTotals.amount}
        count={visiblePayments.length}
      />
      <WorkspacePagination
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, matchingPayments.length)}
        singularLabel="payment"
        totalCount={matchingPayments.length}
        totalPages={totalPages}
      />
      <PaymentForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <PaymentActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}

function PaymentActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: PaymentAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const forceDelete = action?.type === "force-delete";
  const verb = action?.type === "restore" ? "Restore" : forceDelete ? "Force delete" : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {forceDelete
              ? `${action?.record.reference ?? "This payment"} will be permanently removed.`
              : `${action?.record.reference ?? "This payment"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              forceDelete
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            disabled={loading}
            onClick={onConfirm}
          >
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PaymentPageTotals({
  active,
  amount,
  count
}: {
  active: number;
  amount: number;
  count: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border/70 bg-card px-4 py-2.5 shadow-sm md:grid-cols-3">
      <PageTotal label="Page payments" value={String(count)} />
      <PageTotal label="Active" value={String(active)} />
      <PageTotal label="Grand total" strong value={formatMoney(amount)} />
    </div>
  );
}

function PageTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex h-full items-center justify-start gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function showPaymentError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}

function paymentActionMessage(type: PaymentAction["type"]) {
  if (type === "force-delete") return "Payment force deleted";
  return type === "restore" ? "Payment restored" : "Payment suspended";
}

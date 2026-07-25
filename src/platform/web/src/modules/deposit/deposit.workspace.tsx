import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, RefreshCw } from "lucide-react";
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
import { DepositForm } from "./deposit.form";
import { depositQueryKey, useDeposits } from "./deposit.hooks";
import { DepositList } from "./deposit.list";
import { printDepositReport } from "./deposit.print";
import {
  activateDeposit,
  createDeposit,
  deactivateDeposit,
  forceDeleteDeposit,
  updateDeposit
} from "./deposit.services";
import type { DepositRecord, DepositSavePayload } from "./deposit.types";

type DepositAction = {
  record: DepositRecord;
  type: "force-delete" | "restore" | "suspend";
};

export function DepositWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState<DepositRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<DepositAction | null>(null);
  const depositsQuery = useDeposits();

  const saveMutation = useMutation({
    mutationFn: (payload: DepositSavePayload) =>
      editing ? updateDeposit(editing.id, payload) : createDeposit(payload),
    onError: showDepositError("Unable to save deposit"),
    onSuccess: async (record) => {
      await refreshDeposits(queryClient);
      toast.success(`Deposit ${editing ? "updated" : "created"}`, {
        description: `${record.reference} is ready in the list.`
      });
      setEditing(undefined);
    }
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: DepositAction) => {
      if (type === "force-delete") return forceDeleteDeposit(record.id);
      if (type === "restore") return activateDeposit(record.id);
      return deactivateDeposit(record.id);
    },
    onError: showDepositError("Unable to update deposit"),
    onSuccess: async (record, action) => {
      await refreshDeposits(queryClient);
      toast.success(depositActionMessage(action.type), { description: record.reference });
      setPendingAction(null);
    }
  });

  const filteredDeposits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (depositsQuery.data ?? []).filter((record) => {
      const matchesStatus = status === "all" || record.status === status;
      const matchesSearch =
        !term ||
        record.tgCode.toLowerCase().includes(term) ||
        record.bank.toLowerCase().includes(term) ||
        record.name.toLowerCase().includes(term) ||
        record.reference.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [depositsQuery.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filteredDeposits.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageDeposits = filteredDeposits.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const pageTotals = useMemo(
    () => ({
      active: pageDeposits.filter((record) => record.status === "active").length,
      amount: pageDeposits.reduce((total, record) => total + record.amount, 0)
    }),
    [pageDeposits]
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
            disabled={depositsQuery.isFetching}
            onClick={() => void depositsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", depositsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={filteredDeposits.length === 0}
            onClick={() => printDepositReport(filteredDeposits)}
            type="button"
            variant="outline"
          >
            <Printer className="size-4" />
            Print PDF
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New deposit
          </Button>
        </div>
      }
      description="Post and maintain incoming deposit transactions."
      technicalName="page.trades.deposit.list"
      title="Deposits"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All deposits" },
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
        searchPlaceholder="Search deposits"
        searchValue={search}
      />
      <DepositList
        loading={depositsQuery.isFetching && !depositsQuery.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={pageDeposits}
      />
      <DepositPageTotals
        active={pageTotals.active}
        amount={pageTotals.amount}
        count={pageDeposits.length}
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
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredDeposits.length)}
        singularLabel="deposit"
        totalCount={filteredDeposits.length}
        totalPages={totalPages}
      />
      <DepositForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <DepositActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}

function DepositActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: DepositAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = action?.type === "force-delete";
  const verb = action?.type === "restore" ? "Restore" : destructive ? "Force delete" : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} deposit?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.reference ?? "This deposit"} will be permanently removed.`
              : `${action?.record.reference ?? "This deposit"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
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

function DepositPageTotals({
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
      <PageTotal label="Page deposits" value={String(count)} />
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

function refreshDeposits(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: depositQueryKey });
}

function showDepositError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}

function depositActionMessage(type: DepositAction["type"]) {
  if (type === "force-delete") return "Deposit force deleted";
  return type === "restore" ? "Deposit restored" : "Deposit suspended";
}

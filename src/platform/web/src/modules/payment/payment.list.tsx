import { BadgeCheck, CircleCheck, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Button, WorkspaceRowActions, WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { PaymentRecord } from "./payment.types";

export function PaymentList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSettle,
  onSuspend,
  onVerify,
  pendingId,
  records
}: {
  loading: boolean;
  onEdit: (record: PaymentRecord) => void;
  onForceDelete: (record: PaymentRecord) => void;
  onRestore: (record: PaymentRecord) => void;
  onSettle: (record: PaymentRecord) => void;
  onSuspend: (record: PaymentRecord) => void;
  onVerify: (record: PaymentRecord) => void;
  pendingId: number | null;
  records: PaymentRecord[];
}) {
  const columns: ColumnDef<PaymentRecord>[] = [
    {
      accessorKey: "verifiedAt",
      cell: ({ row }) =>
        row.original.verifiedAt ? (
          <WorkspaceStatusBadge label="Verified" tone="success" />
        ) : (
          <Button
            disabled={pendingId === row.original.id || Boolean(row.original.settledAt)}
            onClick={() => onVerify(row.original)}
            size="sm"
            type="button"
            variant="outline"
          >
            <CircleCheck className="size-4" /> Verify
          </Button>
        ),
      header: "Verification"
    },
    {
      accessorKey: "settledAt",
      cell: ({ row }) =>
        row.original.settledAt ? (
          <WorkspaceStatusBadge label="Settled" tone="neutral" />
        ) : (
          <Button
            disabled={pendingId === row.original.id || !row.original.verifiedAt}
            onClick={() => onSettle(row.original)}
            size="sm"
            type="button"
            variant="outline"
          >
            <BadgeCheck className="size-4" /> Settle
          </Button>
        ),
      header: "Settlement"
    },
    {
      accessorKey: "date",
      cell: ({ row }) => format(parseISO(row.original.date), "dd-MMM-yyyy"),
      header: "Date"
    },
    { accessorKey: "tgCode", header: "TG code" },
    {
      accessorKey: "name",
      cell: ({ row }) => (
        <button
          className="cursor-pointer font-medium text-foreground hover:underline"
          onClick={() => onEdit(row.original)}
          type="button"
        >
          {row.original.name ?? "—"}
        </button>
      ),
      header: "Name"
    },
    { accessorKey: "bank", header: "Bank" },
    { accessorKey: "reference", header: "Reference" },
    {
      accessorKey: "amount",
      cell: ({ row }) => <MoneyCell amount={row.original.amount} />,
      header: () => <div className="text-right">Amount</div>
    },
    {
      accessorKey: "status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      ),
      header: "Status"
    },
    {
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div
            className="flex w-full justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <WorkspaceRowActions
              actions={[
                {
                  id: "force-delete",
                  icon: <Trash2 className="size-4" />,
                  label: "Force delete",
                  onSelect: () => onForceDelete(payment),
                  tone: "destructive"
                }
              ]}
              deleteLabel="Suspend"
              isSuspended={payment.status === "inactive"}
              onDelete={() => onSuspend(payment)}
              onEdit={() => onEdit(payment)}
              onRestore={() => onRestore(payment)}
              title={payment.reference ?? payment.tgCode}
            />
          </div>
        );
      },
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      id: "actions",
      size: 96
    }
  ];

  return (
    <div className="[&_td]:border-r [&_td]:border-border/70 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/70 [&_th:last-child]:border-r-0">
      <WorkspaceTable
        columns={columns}
        data={records}
        emptyState="No payments found."
        isLoading={loading}
        minWidth="1220px"
      />
    </div>
  );
}

function MoneyCell({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amount);
  return <div className="text-right font-medium tabular-nums">{formatted}</div>;
}

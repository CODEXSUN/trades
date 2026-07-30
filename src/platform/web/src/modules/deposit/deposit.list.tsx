import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { WorkspaceRowActions, WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { DepositRecord } from "./deposit.types";

export function DepositList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: DepositRecord) => void;
  onForceDelete: (record: DepositRecord) => void;
  onRestore: (record: DepositRecord) => void;
  onSuspend: (record: DepositRecord) => void;
  records: DepositRecord[];
}) {
  const columns: ColumnDef<DepositRecord>[] = [
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
          {row.original.name}
        </button>
      ),
      header: "Name"
    },
    { accessorKey: "bank", header: "Bank" },
    { accessorKey: "reference", header: "Reference" },
    {
      accessorKey: "amount",
      cell: ({ row }) => <Money value={row.original.amount} />,
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
      cell: ({ row }) => (
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
                onSelect: () => onForceDelete(row.original),
                tone: "destructive"
              }
            ]}
            deleteLabel="Suspend"
            isSuspended={row.original.status === "inactive"}
            onDelete={() => onSuspend(row.original)}
            onEdit={() => onEdit(row.original)}
            onRestore={() => onRestore(row.original)}
            title={row.original.reference}
          />
        </div>
      ),
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
        emptyState="No deposits found."
        isLoading={loading}
        minWidth="980px"
      />
    </div>
  );
}

function Money({ value }: { value: number }) {
  return (
    <div className="text-right font-medium tabular-nums">
      {new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      }).format(value)}
    </div>
  );
}

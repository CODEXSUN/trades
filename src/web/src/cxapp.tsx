import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@codexsun/ui/blocks/menu/sidemenu/top-menu";
import { BadgeIndianRupee, CircleGauge, Landmark, WalletCards } from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { configureTradesWebClient } from "./shared/api/trades-api";

configureTradesWebClient({ baseUrl: "/api" });

export type TradesWorkspaceContribution = {
  component: LazyExoticComponent<ComponentType>;
  group: string;
  id: string;
  title: string;
};

function workspace(
  id: string,
  title: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): TradesWorkspaceContribution {
  return { component: lazy(load), group, id, title };
}

function commissionWorkspace(direction: "deposit" | "withdraw") {
  return import("./modules/commission").then((module) => ({
    default: () => <module.CommissionWorkspace direction={direction} />
  }));
}

export const tradesWebBundle = Object.freeze({
  id: "trades",
  rootPath: "/app/trades",
  title: "Trades",
  version: "1.0.9",
  workspaces: Object.freeze([
    workspace("overview", "Overview", "Trades", () =>
      import("./modules/trades-overview").then((module) => ({
        default: module.TradesOverviewWorkspace
      }))
    ),
    workspace("bank-accounts", "Bank Accounts", "Banking", () =>
      import("./modules/bank-account").then((module) => ({
        default: module.BankAccountWorkspace
      }))
    ),
    workspace("deposits", "Deposits", "Trade Details", () =>
      import("./modules/deposit").then((module) => ({
        default: module.DepositWorkspace
      }))
    ),
    workspace("payments", "Payments", "Trade Details", () =>
      import("./modules/payment").then((module) => ({
        default: module.PaymentWorkspace
      }))
    ),
    workspace("deposit-commission", "Deposit Commission", "Commission", () =>
      commissionWorkspace("deposit")
    ),
    workspace("withdrawal-commission", "Withdrawal Commission", "Commission", () =>
      commissionWorkspace("withdraw")
    )
  ]),
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Banking, deposits, payments, reconciliation, and commissions.",
      icon: Landmark,
      title: "Trades",
      url: "/app/trades"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: CircleGauge,
        isActive: activeWorkspaceId === "overview",
        title: "Overview",
        url: "/app/trades"
      },
      {
        icon: Landmark,
        isActive: activeWorkspaceId === "bank-accounts",
        title: "Bank Accounts",
        url: "/app/trades/bank-accounts"
      },
      {
        icon: WalletCards,
        isActive: activeWorkspaceId === "deposits" || activeWorkspaceId === "payments",
        items: [
          {
            isActive: activeWorkspaceId === "deposits",
            title: "Deposits",
            url: "/app/trades/deposits"
          },
          {
            isActive: activeWorkspaceId === "payments",
            title: "Payments",
            url: "/app/trades/payments"
          }
        ],
        title: "Trade Details",
        url: "/app/trades/deposits"
      },
      {
        icon: BadgeIndianRupee,
        isActive:
          activeWorkspaceId === "deposit-commission" ||
          activeWorkspaceId === "withdrawal-commission",
        items: [
          {
            isActive: activeWorkspaceId === "deposit-commission",
            title: "Deposit Commission",
            url: "/app/trades/deposit-commission"
          },
          {
            isActive: activeWorkspaceId === "withdrawal-commission",
            title: "Withdrawal Commission",
            url: "/app/trades/withdrawal-commission"
          }
        ],
        title: "Commission",
        url: "/app/trades/deposit-commission"
      }
    ];
  },
  resolveWorkspace(pathname: string): TradesWorkspaceContribution | undefined {
    const [surface, packageId, workspaceId = "overview"] = pathname.split("/").filter(Boolean);
    if (surface !== "app" || packageId !== "trades") return undefined;
    return this.workspaces.find((entry) => entry.id === workspaceId);
  }
});

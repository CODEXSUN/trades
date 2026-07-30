import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgePercentIcon,
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  CircleGaugeIcon,
  LandmarkIcon,
  ShieldCheckIcon
} from "lucide-react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { ApplicationLayout } from "@codexsun/ui/layouts/application-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken, logout } from "../../shared/api/platform-api";
import {
  applicationEntryPath,
  canAccessAdministratorSettings,
  canSelectApplicationTheme
} from "./app-shell-access";

const TradesOverviewWorkspace = lazy(() =>
  import("../../modules/trades-overview").then((module) => ({
    default: module.TradesOverviewWorkspace
  }))
);
const DepositWorkspace = lazy(() =>
  import("../../modules/deposit").then((module) => ({ default: module.DepositWorkspace }))
);
const PaymentWorkspace = lazy(() =>
  import("../../modules/payment").then((module) => ({ default: module.PaymentWorkspace }))
);
const BankAccountWorkspace = lazy(() =>
  import("../../modules/bank-account").then((module) => ({ default: module.BankAccountWorkspace }))
);
const CommissionWorkspace = lazy(() =>
  import("../../modules/commission").then((module) => ({ default: module.CommissionWorkspace }))
);
const UserWorkspace = lazy(() =>
  import("../../modules/user").then((module) => ({ default: module.UserWorkspace }))
);
const RoleWorkspace = lazy(() =>
  import("../../modules/role").then((module) => ({ default: module.RoleWorkspace }))
);
const PermissionWorkspace = lazy(() =>
  import("../../modules/permission").then((module) => ({ default: module.PermissionWorkspace }))
);
const UserRoleWorkspace = lazy(() =>
  import("../../modules/user-role").then((module) => ({ default: module.UserRoleWorkspace }))
);
const RolePermissionWorkspace = lazy(() =>
  import("../../modules/role-permission").then((module) => ({
    default: module.RolePermissionWorkspace
  }))
);
const UserProfileWorkspace = lazy(() =>
  import("../../modules/user/user.profile.workspace").then((module) => ({
    default: module.UserProfileWorkspace
  }))
);

type Page =
  | "trades.overview"
  | "trades.deposits"
  | "trades.payments"
  | "trades.bank-accounts"
  | "trades.commission"
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.user-roles"
  | "identity.role-permissions"
  | "identity.profile";

type Claims = { email: string; name?: string; permissions?: string[]; role?: string };

export function AppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const administrator = canAccessAdministratorSettings(claims.role);
  const requestedPage = pageFromPath(pathname, claims.role);
  const page = isIdentityAdminPage(requestedPage) && !administrator ? "trades.overview" : requestedPage;
  const select = (next: Page) => void navigate({ to: `/app/${next.replaceAll(".", "/")}` });

  useEffect(() => {
    if (page !== requestedPage) {
      void navigate({ replace: true, to: `/app/${page.replaceAll(".", "/")}` });
    }
  }, [navigate, page, requestedPage]);

  return (
    <AuthGate>
      <ApplicationLayout
        brand={{ subtitle: "single-client workspace", title: "Trades" }}
        headerTitle={titleFor(page)}
        menuItems={buildMenu(page, select, administrator)}
        onLogout={async () => {
          await logout();
          await navigate({ to: "/login" });
        }}
        profileHref="/app/identity/profile"
        showHomeAction={false}
        showSidebarUser={false}
        showThemeAction={canSelectApplicationTheme(claims.role)}
        subtitle={null}
        title={null}
        user={{
          email: claims.email,
          fallback: initials(claims.name ?? claims.email),
          name: claims.name ?? claims.email
        }}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={[
          {
            active: page.startsWith("trades."),
            description: "Deposits, payments, bank accounts, and commission.",
            icon: LandmarkIcon,
            title: "Trades",
            url: "/app/trades/overview"
          },
          ...(administrator
            ? [
                {
                  active: page.startsWith("identity."),
                  description: "Local users, roles, and permissions.",
                  icon: ShieldCheckIcon,
                  title: "Platform",
                  url: "/app/identity/users"
                }
              ]
            : [])
        ]}
      >
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
          <Suspense fallback={<GlobalLoader />}>{renderPage(page, claims.email)}</Suspense>
        </main>
      </ApplicationLayout>
    </AuthGate>
  );
}

function renderPage(page: Page, actorEmail: string) {
  if (page === "trades.overview") return <TradesOverviewWorkspace />;
  if (page === "trades.deposits") return <DepositWorkspace />;
  if (page === "trades.payments") return <PaymentWorkspace />;
  if (page === "trades.bank-accounts") return <BankAccountWorkspace />;
  if (page === "trades.commission") return <CommissionWorkspace direction="deposit" />;
  if (page === "identity.users") return <UserWorkspace actorEmail={actorEmail} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.user-roles") return <UserRoleWorkspace />;
  if (page === "identity.role-permissions") return <RolePermissionWorkspace />;
  return <UserProfileWorkspace />;
}

function buildMenu(page: Page, select: (page: Page) => void, administrator: boolean): SidemenuItem[] {
  const item = (title: string, target: Page, icon?: typeof LandmarkIcon) => ({
    ...(icon ? { icon } : {}),
    isActive: page === target,
    onSelect: () => select(target),
    title
  });
  if (!administrator || page.startsWith("trades.")) {
    return [
      {
        icon: LandmarkIcon,
        isActive: true,
        items: [
          item("Overview", "trades.overview", CircleGaugeIcon),
          item("Deposits", "trades.deposits", BanknoteArrowDownIcon),
          item("Payments", "trades.payments", BanknoteArrowUpIcon),
          item("Bank Accounts", "trades.bank-accounts", LandmarkIcon),
          item("Commission", "trades.commission", BadgePercentIcon)
        ],
        title: "Trades"
      }
    ];
  }
  return [
    {
      icon: ShieldCheckIcon,
      isActive: true,
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("User Roles", "identity.user-roles"),
        item("Role Permissions", "identity.role-permissions")
      ],
      title: "Platform"
    }
  ];
}

function isIdentityAdminPage(page: Page) {
  return page.startsWith("identity.") && page !== "identity.profile";
}

function pageFromPath(pathname: string, role: string | undefined): Page {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: Page[] = [
    "trades.overview",
    "trades.deposits",
    "trades.payments",
    "trades.bank-accounts",
    "trades.commission",
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.user-roles",
    "identity.role-permissions",
    "identity.profile"
  ];
  if (allowed.includes(value as Page)) return value as Page;
  return applicationEntryPath(role).replace(/^\/app\//u, "").replaceAll("/", ".") as Page;
}

function titleFor(page: Page) {
  const labels: Partial<Record<Page, string>> = {
    "trades.bank-accounts": "Bank Accounts",
    "trades.commission": "Commission",
    "trades.deposits": "Deposits",
    "trades.overview": "Trades Overview",
    "trades.payments": "Payments"
  };
  return labels[page] ?? page.split(".").at(-1)!.replaceAll("-", " ");
}

function readClaims(): Claims {
  const token = getToken();
  if (!token) return { email: "" };
  try {
    return JSON.parse(atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as Claims;
  } catch {
    return { email: "" };
  }
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

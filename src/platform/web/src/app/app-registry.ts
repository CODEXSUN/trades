import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  Building2Icon,
  CircleGaugeIcon,
  ClipboardListIcon,
  Globe2Icon,
  HandshakeIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  MapPinnedIcon,
  PackageIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon
} from "lucide-react";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";

export type PlatformAppId = "application" | "trades";

export type PlatformAppDefinition = {
  accentClass: string;
  alwaysEnabled: boolean;
  defaultLanding: boolean;
  description: string;
  id: PlatformAppId;
  icon: LucideIcon;
  label: string;
  moduleKey: string;
  stack: "platform";
};

export const defaultTenantModuleKeys = ["platform.application", "platform.trades"] as const;

export const platformAppRegistry: PlatformAppDefinition[] = [
  {
    accentClass: "bg-slate-950",
    alwaysEnabled: true,
    defaultLanding: true,
    description: "Application workspace, organisation, masters, client profile, users, and access.",
    icon: LayoutDashboardIcon,
    id: "application",
    label: "Application",
    moduleKey: "platform.application",
    stack: "platform"
  },
  {
    accentClass: "bg-emerald-700",
    alwaysEnabled: true,
    defaultLanding: false,
    description: "Trades business workspace and operational overview.",
    icon: HandshakeIcon,
    id: "trades",
    label: "Trades",
    moduleKey: "platform.trades",
    stack: "platform"
  }
];

export function normalizeModuleKeys(moduleKeys: string[]) {
  return Array.from(
    new Set([
      ...defaultTenantModuleKeys,
      ...moduleKeys
        .filter(
          (key) => key !== "billing.sales" && key !== "mail" && key !== "crm" && key !== "frappe"
        )
        .map((key) => (key === "platform.tenant" ? "platform.application" : key))
    ])
  );
}

export function enabledAppIds(moduleKeys: string[]) {
  const enabled = new Set(normalizeModuleKeys(moduleKeys));
  return platformAppRegistry
    .filter((app) => app.alwaysEnabled || enabled.has(app.moduleKey))
    .map((app) => app.id);
}

export function defaultLandingApp(value: unknown, moduleKeys: string[]): PlatformAppId {
  const requested = typeof value === "string" ? value : "";
  const enabled = enabledAppIds(moduleKeys);
  return enabled.includes(requested as PlatformAppId)
    ? (requested as PlatformAppId)
    : "application";
}

export function appMenuFor(
  appId: PlatformAppId,
  activePage: string,
  onSelect: (page: string) => void
): SidemenuItem {
  if (appId === "trades") {
    return {
      icon: HandshakeIcon,
      isActive: true,
      items: tradesMenuItems(activePage, onSelect),
      title: "Trades"
    };
  }
  return {
    icon: Building2Icon,
    isActive: true,
    items: applicationMenuItems(activePage, onSelect),
    title: "Application"
  };
}

export function appMenuItemsFor(
  appId: PlatformAppId,
  activePage: string,
  onSelect: (page: string) => void,
  permissions: string[] = []
): SidemenuItem[] {
  if (appId === "trades") return tradesMenuItems(activePage, onSelect, permissions);
  return applicationMenuItems(activePage, onSelect);
}

export function appWorkspaceItems(enabledApps: PlatformAppId[], activeApp: PlatformAppId) {
  return platformAppRegistry
    .filter((app) => enabledApps.includes(app.id))
    .map((app) => ({
      active: app.id === activeApp,
      description: app.description,
      id: app.id,
      icon: app.icon,
      title: app.label,
      url: `/app/${app.id}/overview`
    }));
}

export const applicationPageIcons = {
  application: Building2Icon,
  trades: HandshakeIcon
};

function tradesMenuItems(
  activePage: string,
  onSelect: (page: string) => void,
  permissions: string[] = []
): SidemenuItem[] {
  const canViewDeposits =
    permissions.length === 0 || permissions.includes("platform.trades.deposit.view");
  const canViewPayments =
    permissions.length === 0 || permissions.includes("platform.trades.payment.view");
  const details: SidemenuItem[] = [
    ...(canViewDeposits
      ? [
          {
            icon: ArrowDownToLineIcon,
            isActive: activePage === "trades.details.deposits",
            onSelect: () => onSelect("trades.details.deposits"),
            title: "Deposits"
          }
        ]
      : []),
    ...(canViewPayments
      ? [
          {
            icon: ArrowUpFromLineIcon,
            isActive: activePage === "trades.details.payments",
            onSelect: () => onSelect("trades.details.payments"),
            title: "Payments"
          }
        ]
      : [])
  ];
  return [
    {
      icon: CircleGaugeIcon,
      isActive: activePage === "trades.overview",
      onSelect: () => onSelect("trades.overview"),
      title: "Overview"
    },
    ...(details.length
      ? [
          {
            icon: LandmarkIcon,
            isActive: activePage.startsWith("trades.details"),
            items: details,
            title: "Trade Details"
          }
        ]
      : [])
  ];
}

function applicationMenuItems(
  activePage: string,
  onSelect: (page: string) => void
): SidemenuItem[] {
  return [
    {
      icon: CircleGaugeIcon,
      isActive: activePage === "application.overview",
      onSelect: () => onSelect("application.overview"),
      title: "Overview"
    },
    {
      icon: ShieldCheckIcon,
      isActive: activePage.startsWith("application.access"),
      title: "Access Control",
      items: (
        [
          ["Users", "application.access.users"],
          ["Roles", "application.access.roles"],
          ["Permissions", "application.access.permissions"],
          ["User Roles", "application.access.user-roles"],
          ["Role Permissions", "application.access.role-permissions"]
        ] as const
      ).map(([title, page]) => ({
        isActive: activePage === page,
        onSelect: () => onSelect(page),
        title
      }))
    },
    {
      icon: Building2Icon,
      isActive:
        activePage === "application.landing" ||
        activePage === "application.profile" ||
        activePage === "application.settings",
      title: "Application",
      items: (
        [
          ["Landing Desk", "application.landing"],
          ["Platform Profile", "application.profile"],
          ["Settings", "application.settings"]
        ] as const
      ).map(([title, page]) => ({
        isActive: activePage === page,
        onSelect: () => onSelect(page),
        title
      }))
    },
    {
      icon: Building2Icon,
      isActive: activePage.startsWith("core.organisation"),
      title: "Organisation",
      items: (
        [
          ["Company", "core.organisation.company"],
          ["Financial Years", "core.organisation.financial-year"],
          ["Default Company", "core.organisation.default-company"]
        ] as const
      ).map(([title, page]) => ({
        isActive: activePage === page,
        onSelect: () => onSelect(page),
        title
      }))
    },
    {
      icon: PackageIcon,
      isActive: activePage.startsWith("core.master"),
      title: "Master",
      items: (
        [
          ["Contact", "core.master.contact"],
          ["Product", "core.master.product"],
          ["Work Order", "core.master.work-order"]
        ] as const
      ).map(([title, page]) => ({
        isActive: activePage === page,
        onSelect: () => onSelect(page),
        title
      }))
    },
    {
      icon: Globe2Icon,
      isActive: activePage.startsWith("core.common"),
      title: "Common",
      items: [
        {
          icon: MapPinnedIcon,
          title: "Location",
          isActive: activePage.startsWith("core.common.location"),
          items: (
            [
              ["Countries", "core.common.location.countries"],
              ["States", "core.common.location.states"],
              ["Districts", "core.common.location.districts"],
              ["Cities", "core.common.location.cities"],
              ["Pincodes", "core.common.location.pincodes"]
            ] as const
          ).map(([title, page]) => ({
            isActive: activePage === page,
            onSelect: () => onSelect(page),
            title
          }))
        },
        ...commonMasterMenuGroups(activePage, onSelect)
      ]
    }
  ];
}

function commonMasterMenuGroups(
  activePage: string,
  onSelect: (page: string) => void
): SidemenuItem[] {
  const groups = [
    {
      icon: LandmarkIcon,
      id: "accounts",
      label: "Accounts",
      pages: [
        ["Ledger Groups", "core.common.accounts.ledger-groups"],
        ["Ledgers", "core.common.accounts.ledgers"]
      ]
    },
    {
      icon: UsersIcon,
      id: "contacts",
      label: "Contacts",
      pages: [
        ["Contact Groups", "core.common.contacts.contact-groups"],
        ["Contact Types", "core.common.contacts.contact-types"],
        ["Address Types", "core.common.contacts.address-types"],
        ["Bank Names", "core.common.contacts.bank-names"]
      ]
    },
    {
      icon: PackageIcon,
      id: "products",
      label: "Product",
      pages: [
        ["Product Groups", "core.common.products.product-groups"],
        ["Product Categories", "core.common.products.product-categories"],
        ["Product Types", "core.common.products.product-types"],
        ["Units", "core.common.products.units"],
        ["HSN Codes", "core.common.products.hsn-codes"],
        ["Taxes", "core.common.products.taxes"],
        ["Brands", "core.common.products.brands"],
        ["Colours", "core.common.products.colours"],
        ["Sizes", "core.common.products.sizes"],
        ["Styles", "core.common.products.styles"]
      ]
    },
    {
      icon: ClipboardListIcon,
      id: "workorder",
      label: "Work Orders",
      pages: [
        ["Work Order Types", "core.common.workorder.work-order-types"],
        ["Transports", "core.common.workorder.transports"],
        ["Warehouses", "core.common.workorder.warehouses"],
        ["Destinations", "core.common.workorder.destinations"],
        ["Stock Rejection Types", "core.common.workorder.stock-rejection-types"]
      ]
    },
    {
      icon: Settings2Icon,
      id: "others",
      label: "Others",
      pages: [
        ["Currencies", "core.common.others.currencies"],
        ["Priorities", "core.common.others.priorities"],
        ["Payment Terms", "core.common.others.payment-terms"],
        ["Sales Types", "core.common.others.sales-types"],
        ["Months", "core.common.others.months"]
      ]
    }
  ] as const;

  return groups.map((group) => ({
    icon: group.icon,
    isActive: activePage.startsWith(`core.common.${group.id}.`),
    items: group.pages.map(([title, page]) => ({
      isActive: activePage === page,
      onSelect: () => onSelect(page),
      title
    })),
    title: group.label
  }));
}

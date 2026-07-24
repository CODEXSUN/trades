import {
  ArrowRight,
  Building2,
  Database,
  KeyRound,
  Network,
  ShieldCheck,
  Store,
  UsersRound
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantSecurityPage() {
  return (
    <TenantSiteTemplate activePage="security" pageTitle="Access and security">
      <StoresPageContent />
    </TenantSiteTemplate>
  );
}

function StoresPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Client, users, and access"
        title="A clean security foundation for one client application."
        summary={`${portal.brandName} keeps one configured client database, role-aware users, and explicit permission checks across business modules.`}
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open secure workspace <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Building2 />
            <h3>Single-client boundary</h3>
            <p>
              Trades uses one configured business database and never exposes a database or client
              selector to users.
            </p>
          </article>
          <article className="tenant-card">
            <KeyRound />
            <h3>Role-aware access</h3>
            <p>
              Administrative setup stays protected while staff receive only the business tools their
              responsibilities require.
            </p>
          </article>
          <article className="tenant-card">
            <Database />
            <h3>Data boundaries</h3>
            <p>
              The signed client context remains explicit through authentication, APIs, persistence,
              jobs, and integrations.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-split">
          <div>
            <span className="tenant-kicker">Operational access</span>
            <h2>Shared visibility with clear responsibility.</h2>
            <p>
              Roles and permissions keep administration protected while authorised users work with
              the modules and records required by their responsibilities.
            </p>
          </div>
          <div className="tenant-check-list">
            <span>
              <Store /> Store-specific teams and activity
            </span>
            <span>
              <UsersRound /> Owner, manager, and staff roles
            </span>
            <span>
              <Network /> Shared network standards
            </span>
            <span>
              <ShieldCheck /> Permission-aware cross-store visibility
            </span>
          </div>
        </div>
      </section>
      <TenantPortalCta
        title="Use one secure workspace for the Trades client."
        summary="Application administration is restricted to the client administrator and protected by explicit permissions."
      />
    </>
  );
}

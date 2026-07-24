import {
  ArrowRight,
  Boxes,
  Building2,
  Network,
  ShieldCheck,
  Store,
  UsersRound
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantFeaturesPage() {
  return (
    <TenantSiteTemplate activePage="features" pageTitle="LogicX software">
      <LogicXPageContent />
    </TenantSiteTemplate>
  );
}

function LogicXPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="LogicX by Trades"
        title="Business software that starts simple and grows with the work."
        summary={`LogicX is ${portal.brandName}'s software direction for customer enquiries, team responsibility, products, stock, sales, service, and reporting.`}
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open LogicX foundation <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-section-heading">
          <span>Available foundation</span>
          <h2>Start with organisation, masters, and controlled access.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <ShieldCheck />
            <h3>Application access</h3>
            <p>Manage users, roles, permissions, and protected application administration.</p>
          </article>
          <article className="tenant-card">
            <UsersRound />
            <h3>User responsibility</h3>
            <p>
              Give owners, managers, staff, and users the application access appropriate to their
              work.
            </p>
          </article>
          <article className="tenant-card">
            <Building2 />
            <h3>Organisation and masters</h3>
            <p>Maintain companies, financial years, contacts, products, and common lookups.</p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-section-heading">
          <span>Product direction</span>
          <h2>Designed as one coherent operating workspace.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-four">
          <article className="tenant-card">
            <Store />
            <h3>Stores</h3>
            <p>Location-specific work, staff, counters, and daily visibility.</p>
          </article>
          <article className="tenant-card">
            <Boxes />
            <h3>Products and stock</h3>
            <p>Hardware catalogues, availability, movement, and reorder context.</p>
          </article>
          <article className="tenant-card">
            <Building2 />
            <h3>Companies</h3>
            <p>Organisation, financial-year, branch, and operational context for this client.</p>
          </article>
          <article className="tenant-card">
            <Network />
            <h3>Reporting</h3>
            <p>Permission-aware visibility across implemented business modules.</p>
          </article>
        </div>
        <p className="tenant-roadmap-note">
          <ShieldCheck /> These are staged product goals. Current screens expose only capabilities
          that are already implemented.
        </p>
      </section>
      <TenantPortalCta
        title="Start with one application. Add business modules deliberately."
        summary="LogicX will grow through module-owned capabilities without mixing data or responsibilities across module boundaries."
      />
    </>
  );
}

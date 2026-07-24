import { CheckCircle2, CircleDot, Clock3, Store } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantUpdatesPage() {
  return (
    <TenantSiteTemplate activePage="updates" pageTitle="Product direction">
      <TenantPageIntro
        eyebrow="Product direction"
        title="A staged path from a simple application foundation to a complete trading workspace."
        summary="This page separates what is working now from what Trades intends to build next. Roadmap items are not presented as released features."
      />
      <section className="tenant-section">
        <div className="tenant-timeline">
          <article>
            <CheckCircle2 />
            <div>
              <span>Available now</span>
              <h3>Single-client foundation, roles, organisation, and masters</h3>
              <p>Application setup with permission-aware Core organisation and master workflows.</p>
            </div>
          </article>
          <article>
            <CircleDot />
            <div>
              <span>Next modules</span>
              <h3>Products, stock context, customers, quotations, orders, and service</h3>
              <p>
                Each capability will be introduced through its own module boundary and verified
                persistence flow.
              </p>
            </div>
          </article>
          <article>
            <Clock3 />
            <div>
              <span>Later stage</span>
              <h3>Sales, service, and consolidated owner visibility</h3>
              <p>
                Permission-aware stock, teams, activity, and reporting inside the one client
                database.
              </p>
            </div>
          </article>
          <article>
            <Store />
            <div>
              <span>Longer direction</span>
              <h3>Integrated business reporting</h3>
              <p>
                Shared policies and product standards with controlled operations and clear data
                ownership.
              </p>
            </div>
          </article>
        </div>
      </section>
    </TenantSiteTemplate>
  );
}

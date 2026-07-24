import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantPrivacyPage() {
  return (
    <TenantSiteTemplate activePage="privacy" pageTitle="Privacy">
      <TenantPageIntro
        eyebrow="Privacy"
        title="Business information should stay inside the business context that owns it."
        summary="This public summary explains the privacy direction for Trades and LogicX. Final contractual terms may add region, service, and customer-specific detail."
      />
      <section className="tenant-section tenant-prose">
        <h2>Information we handle</h2>
        <p>
          Account, client, user, enquiry, store, product, operational, support, and technical
          information may be handled when the related feature is enabled and used.
        </p>
        <h2>Why it is used</h2>
        <p>
          Information is used to authenticate users, provide requested workflows, protect client
          data, support the service, diagnose failures, and improve authorised product operation.
        </p>
        <h2>Client and user boundaries</h2>
        <p>
          Business data remains inside the configured Trades client database. Access follows
          explicit roles and permissions rather than making every module visible to every user.
        </p>
        <h2>Your responsibility</h2>
        <p>
          Use authorised accounts, protect credentials, assign access carefully, and avoid entering
          unnecessary sensitive information in general notes or support messages.
        </p>
        <h2>Questions</h2>
        <p>
          Use the Trades contact route for privacy or data-handling questions. Do not include
          passwords, one-time codes, or access tokens.
        </p>
      </section>
    </TenantSiteTemplate>
  );
}

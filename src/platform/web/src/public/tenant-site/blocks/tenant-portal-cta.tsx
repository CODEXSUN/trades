import { ArrowRight } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";

export function TenantPortalCta({
  summary = "Sign in to continue with the Trades application workspace and available business tools.",
  title = "Ready to continue with Trades?"
}: {
  summary?: string;
  title?: string;
}) {
  const { portal } = useTenantSite();

  return (
    <section className="tenant-cta">
      <div>
        <span>Trades application</span>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
        Open application <ArrowRight />
      </a>
    </section>
  );
}

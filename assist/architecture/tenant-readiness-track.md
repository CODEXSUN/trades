# Trades Single-Client Readiness

## Status

Trades is a mono-client application, not a multi-tenant product. The authoritative boundary is
documented in `tenant-isolation.md`.

The runtime has:

- one configured client identity;
- one physical database configured by `TRADES_DB_NAME`;
- one login surface without client or corporate selection;
- no tenant onboarding, tenant switching, or cross-tenant administration capability.

Core currently requires tenant-named signed claims, request headers, and database connection
functions. Trades fills those contracts with its one fixed client and the one Trades database.
That terminology is an internal compatibility seam only and must not be exposed as a product
capability or used to select another database.

Multiple companies, branches, warehouses, counters, devices, accounting years, and users are
records inside this one client application.

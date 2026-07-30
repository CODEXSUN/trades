# Trades Assist

Trades is standalone and single-client. Its runtime contains Platform identity and access control,
plus Deposit, Payment, Bank Account, and Commission modules. Authentication is local only.

There is one MariaDB database selected by `DB_NAME`. Do not add customer registries, database
routers, domain selectors, external identity gateways, or alternate administrator desks.

Read `AGENT-GUIDE.md`, then the relevant architecture and governance rules before changing code.

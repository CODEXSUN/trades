# Module Boundaries

The API composition root registers Platform identity modules followed by `trades.bank-account`,
`trades.deposit`, `trades.payment`, and `trades.commission`. It owns ordering and dependency
injection only.

Each backend leaf owns routes, services, repositories, migrations, seeds, and types. Each frontend
leaf owns its workspace, form, list, services, hooks, schemas, and types. The Trades desk composes
these public leaves and Platform administration.

External sales and identity integrations are outside this repository.

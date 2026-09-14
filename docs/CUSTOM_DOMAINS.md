# Website custom domains

Custom domains are website-scoped routes. They are deliberately separate from `HostingDomain`,
which is the system-wide pool used when the factory assigns a subdomain during website creation.

## Owner workflow

The website editor provides a four-step flow: enter the root domain, copy the displayed DNS
records, add the generated TXT challenge and verify it, then configure selected or wildcard
subdomains. Active exact routes can be opened and tested from the same screen. The screen refreshes
while verification jobs run, so activation does not require a manual browser refresh.

Set `FACTORY_INGRESS_IPV4` to the public origin address that the wizard should show in A records.

## Ownership and isolation

- Only the control-panel platform administrator roles (`owner` or `admin`) can list or mutate
  custom-domain routes.
- Client-account editor loads omit custom domains completely.
- The global Domains screen lists only system-generated routes and hosting base domains.
- A database trigger rejects exact/wildcard overlaps that would route one hostname to different
  websites, including across tenant RLS boundaries.
- Exact routes take precedence over a wildcard belonging to the same website.

## Route modes

A website can connect an apex domain, `www`, selected first-level labels, or `*.example.com`.
Wildcard routes match subdomains only; the apex must be selected separately. Each route must pass
the DNS TXT challenge at `_factory-verification.<root-domain>` before it becomes active.

## DNS examples

For `emadramsis.com`, point the apex `A`/`AAAA` record to the platform ingress. Point `www` to the
apex with `CNAME`. When **All subdomains** is enabled, also add `CNAME * emadramsis.com` (or a
wildcard `A` record to the ingress). The ownership TXT values shown in the website editor may
coexist at the same TXT name.

## TLS and ingress

`deployment/caddy/Caddyfile` enables on-demand TLS. Caddy asks
`/api/internal/domains/authorize?domain=<hostname>` before issuing a certificate. The endpoint
approves only an active route attached to a published website, so arbitrary hostnames cannot
consume certificates. Install this Caddyfile at the ingress and reload Caddy after deployment.

#!/usr/bin/env bash
set -euo pipefail

# Invoked by the dedicated GitHub Actions deploy account after it uploads a
# source archive to /opt/mportfolio/incoming. This script is intentionally kept
# on the server as /usr/local/sbin/mportfolio-deploy as well as in the repo.

release_id="${1:?release identifier is required}"
archive="/opt/mportfolio/incoming/${release_id}.tgz"
release="/opt/mportfolio/releases/${release_id}"
environment="/etc/mportfolio/factory.env"

test -f "$archive"
test ! -e "$release"
install -d -o factory -g factory -m 0750 "$release"
tar -xzf "$archive" -C "$release"
rm -f "$archive"
chown -R factory:factory "$release"

run_as_factory() {
  runuser -u factory -- bash -lc "set -a; source '$environment'; set +a; cd '$release'; $*"
}

run_as_factory '/usr/bin/corepack pnpm install --frozen-lockfile'
run_as_factory '/usr/bin/corepack pnpm db:generate'
run_as_factory 'DATABASE_URL="$FACTORY_MIGRATOR_DATABASE_URL" /usr/bin/corepack pnpm db:deploy'

runuser -u postgres -- psql -d factory -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO factory_app, factory_renderer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO factory_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO factory_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO factory_renderer;
ALTER DEFAULT PRIVILEGES FOR USER factory_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO factory_app;
ALTER DEFAULT PRIVILEGES FOR USER factory_migrator IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO factory_app;
ALTER DEFAULT PRIVILEGES FOR USER factory_migrator IN SCHEMA public GRANT SELECT ON TABLES TO factory_renderer;
SQL

run_as_factory '/usr/bin/corepack pnpm build'
run_as_factory '/usr/bin/corepack pnpm templates:sync'
ln -sfn "$release" /opt/mportfolio/current.new
mv -Tf /opt/mportfolio/current.new /opt/mportfolio/current
systemctl enable factory-provider-bridge factory-renderer factory-dashboard factory-worker
systemctl restart factory-provider-bridge factory-renderer factory-dashboard factory-worker

wait_for_health() {
  local name="$1"
  shift
  for attempt in $(seq 1 30); do
    if "$@" >/dev/null; then
      return 0
    fi
    if [ "$attempt" = 30 ]; then
      echo "Health check did not become ready: $name" >&2
      exit 1
    fi
    sleep 2
  done
}

wait_for_health provider-bridge curl --fail --silent --show-error http://127.0.0.1:3003/health
wait_for_health renderer curl --fail --silent --show-error http://127.0.0.1:3001/api/health
wait_for_health dashboard curl --fail --silent --show-error -H 'Host: mportfolio.ink' http://127.0.0.1:3000/api/health

find /opt/mportfolio/releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr | tail -n +4 | cut -d ' ' -f2- | xargs -r rm -rf

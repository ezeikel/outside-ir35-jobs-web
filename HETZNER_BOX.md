# Shared Hetzner Worker Box — Chewy Bytes

**A single source of truth for the multi-project Hetzner server that hosts background workers for Chewy Bytes projects.**

This file lives at the repo root of every project that deploys to this box, and is kept byte-identical across all of them. If you edit it, edit it in all places (or better, edit in one and copy).

Projects currently sharing this file:

- [`ezeikel/auntie-marlenes`](https://github.com/ezeikel/auntie-marlenes)
- [`ezeikel/parking-ticket-pal-worker`](https://github.com/ezeikel/parking-ticket-pal-worker)
- [`ezeikel/chunky-crayon`](https://github.com/ezeikel/chunky-crayon) → this repo
- [`ezeikel/ezeikel`](https://github.com/ezeikel/ezeikel)
- [`ezeikel/go-unbeaten`](https://github.com/ezeikel/go-unbeaten)
- [`ezeikel/outside-ir35-jobs-web`](https://github.com/ezeikel/outside-ir35-jobs-web)

---

## TL;DR

|                         |                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Host**                | `157.90.168.197`                                                                                                                 |
| **SSH**                 | `ssh root@157.90.168.197` (key: `~/.ssh/id_ed25519`)                                                                             |
| **OS**                  | Ubuntu 24.04.3 LTS                                                                                                               |
| **Hardware**            | Hetzner Cloud CX23: 2 vCPU, 4 GB RAM, 75 GB disk                                                                                 |
| **Hostname on box**     | `parking-ticket-pal-scraper-01` (historical — the box was originally provisioned for PTP, kept as-is to avoid breaking anything) |
| **Runtime**             | Bun 1.3.1 at `/root/.bun/bin/bun`                                                                                                |
| **Service manager**     | systemd (all workers run as root via unit files in `/etc/systemd/system/`)                                                       |
| **Reverse proxy / TLS** | None. Services bind directly to localhost ports. Cron triggers from Vercel hit the box's public IP on the project-specific port. |

---

## Current inhabitants

| Project                              | Repo                                | Box directory          | Commit           | Systemd unit(s)                                 | Port     | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ----------------------------------- | ---------------------- | ---------------- | ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parking Ticket Pal worker + API**  | `ezeikel/parking-ticket-pal-worker` | `/opt/worker`          | (live)           | `worker-api.service`, `worker-watchdog.service` | **3002** | Dual-role Hono server: **(1) Scraper** — London Tribunals + Trafficase + TPT + council-data scrapers via Playwright + Xvfb, controlled by `/start`, `/stop`, `/scrapers/*` endpoints. **(2) AI automation API** — challenge generation and file automation for PTP's main app, exposed via `/automation/generate`, `/automation/challenge`, `/automation/verify`, `/automation/status/:jobId`. Both roles share the same process, same port, same env file, same systemd unit. Watchdog unit restarts scraper sub-processes on crashes. |
| **Auntie Marlene's content worker**  | `ezeikel/auntie-marlenes`           | `/opt/auntie-marlenes` | (live)           | `content-worker.service`                        | **3020** | Hono HTTP server for daily social posts, blog auto-generation, product image updates. Also hosts one-off CLI scripts for hero asset regeneration (`pnpm gen:hero`, `pnpm gen:hero-videos-*`) that run on-demand via SSH, not via HTTP.                                                                                                                                                                                                                                                                                                  |
| **Chunky Crayon social demo worker** | `ezeikel/chunky-crayon`             | `/opt/chunky-crayon`   | (pending deploy) | `chunky-crayon-worker.service`                  | **3030** | Hono HTTP server that drives the live CC web app via Playwright + `xvfb-run` to record a Magic Brush reveal video, composites it with Remotion + ElevenLabs voiceover/music, and posts to IG Reels / FB Reels / TikTok / Pinterest on a Vercel-cron-triggered schedule.                                                                                                                                                                                                                                                                 |
| **Ezeikel dev-content reel worker**  | `ezeikel/ezeikel`                   | `/opt/ezeikel`         | (pending deploy) | `ezeikel-worker.service`                        | 3040     | Hono HTTP server that posts dev-content Reels (JS/TS/AI/tooling tips) to Ezeikel's personal IG Business + FB Page on a Vercel-cron-triggered schedule. Pipeline: Perplexity research → LLM script compression → ElevenLabs voice (cloned) → Remotion render with Shiki-highlighted code → R2 upload → Graph API publish. Mirrors the chunky-crayon-worker shape, minus Playwright.                                                                                                                                                      |
| **Go Unbeaten promo reel worker**    | `ezeikel/go-unbeaten`               | `/opt/go-unbeaten`     | (pending deploy) | `go-unbeaten-worker.service`                    | 3050     | Hono HTTP server that renders the Go Unbeaten promo reels (Promo + MultiSport compositions) with Remotion + ElevenLabs voiceover/music via `POST /generate/promo` (bearer-auth). Monorepo worker at `apps/worker/`; imports the shared `@go-unbeaten/game` core (raw TS, no build step). No Playwright. Run via pnpm (workspace:* deps).                                                                                                                                                                                                |
| **Outside IR35 Jobs aggregation worker** | `ezeikel/outside-ir35-jobs-web`   | `/opt/outside-ir35-jobs-web` | (live)     | `outside-ir35-jobs-worker.service`              | **3060** | Hono HTTP server that aggregates UK outside-IR35 contract roles. `POST /aggregate/jobserve` + `POST /aggregate/cwjobs` (bearer-auth) scrape Jobserve (Browserbase Stagehand capturing the SPA's RetrieveJobs JSON API) and CWJobs (deterministic parse of server-rendered job-item cards; no detail fetch — totaljobs.com detail pages are HTTP/2-walled), classify IR35 signal + extract structured fields with Claude Sonnet, embed with OpenAI, and upsert source-attributed AGGREGATED jobs into Neon. Monorepo worker at `apps/outside-ir35-jobs-worker/`; imports `@outside-ir35-jobs/db` (workspace:*). **Runs under Node/tsx, NOT Bun** — Stagehand's Playwright doesn't support Bun. Triggered by the web app's daily Vercel cron. Browserbase = remote browser, so light on box RAM (no local Chromium/xvfb). |

**Disk usage as of last audit (April 2026):** ~9 GB total across both projects, 52 GB free on `/dev/sda1`.

**Memory footprint at idle:** PTP worker ~2.6 GB (Chrome + Playwright-heavy), AM content-worker ~120 MB. Total ~2.8 GB of 4 GB = box is getting tight. See [Capacity](#capacity) below.

### Stale directories, currently unused

These exist on the box but are **not serving any live traffic or processes**. Confirmed via audit (April 2026): no systemd unit references them, no running process comes from them, no port is bound by them.

- **`/opt/parking-ticket-pal/`** (295 MB) — a clone of the PTP _monorepo_ (`ezeikel/parking-ticket-pal`, the web + mobile app repo), last pulled Jan 25 2026. Contains `apps/web/`, `apps/mobile/`, no `node_modules/`. **Do not confuse this with PTP's actual worker** — the worker lives at `/opt/worker/` and is a different repo entirely (`parking-ticket-pal-worker`). **History:** this was an early attempt (Jan 2026) to run PTP on the box directly from the monorepo, before the team extracted the worker code into its own `parking-ticket-pal-worker` repo and migrated to `/opt/worker/`. The monorepo clone was left behind rather than cleaned up. Not referenced by any running systemd unit. Safe to `rm -rf` when cleaning up; can be re-cloned in seconds if ever needed.
- **`/opt/scraper/`** (12 KB, empty dir) — zombie from PTP's original setup guide when the project was still called "scraper" before being renamed to "worker". Safe to `rmdir` when cleaning up.

---

## Access

### SSH

One deploy key on the box: `/root/.ssh/authorized_keys` contains a single ed25519 pubkey matching `~/.ssh/id_ed25519` on Ezeikel's laptop (SHA256 `K/UvaZVUB/BX53j548khrThZ3MoIk7JNjinadY1NgIM`).

Both projects' GitHub Actions deploy workflows use this same private key, set as the `HETZNER_SSH_KEY` secret on each repo. **Consequence:** a compromise of one repo's secret compromises the other and SSH access. Acceptable for a solo maintainer; document rotation if the team grows.

### Rotating the SSH key

1. `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_hetzner_new -C "hetzner-deploy-$(date +%Y%m)"`
2. SSH to the box with the current key, append the new public key to `~/.ssh/authorized_keys`, verify login works with the new key in another terminal, then remove the old line
3. Update `HETZNER_SSH_KEY` on every repo that deploys to the box: `gh secret set HETZNER_SSH_KEY --repo <repo> < ~/.ssh/id_ed25519_hetzner_new`
4. Trigger a deploy on each repo via `gh workflow run` to verify the new key works
5. Delete the old local key file once all deploys are confirmed green

### GitHub secrets per repo

Each deploying repo needs exactly three secrets:

| Secret            | Value                                                   | Notes                                                        |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `HETZNER_HOST`    | `157.90.168.197`                                        | Public IP; not sensitive but set as a secret for consistency |
| `HETZNER_USER`    | `root`                                                  | All services run as root currently                           |
| `HETZNER_SSH_KEY` | Contents of `~/.ssh/id_ed25519` (private key, full PEM) | Must match box's `authorized_keys`                           |

Set via `gh secret set <NAME> --repo <owner>/<repo>`. For the key specifically: `gh secret set HETZNER_SSH_KEY --repo <owner>/<repo> < ~/.ssh/id_ed25519`.

---

## Conventions

These conventions are what keep projects from stepping on each other. **Follow them when adding a new project.**

### Directory naming

- **One top-level directory under `/opt/` per project.**
- Use the **git repo name** as the directory name (`/opt/<repo-name>/`).
- Exceptions exist for historical reasons (`/opt/worker` is PTP — predates this convention). Don't fix exceptions; they're load-bearing and renaming them risks breaking the running service's file paths, logs, and systemd units. Just follow the new convention for new projects.
- The full repo is git-cloned into the directory (`/opt/<name>/.git` exists). Deploys are `git pull`, not file sync.

### Port allocation

Each project gets a unique port on `127.0.0.1` (or `*` if it needs to be externally reachable for Vercel cron POSTs). Allocated so far:

| Port        | Owner                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| 22          | sshd                                                                          |
| 53          | systemd-resolved                                                              |
| 3002        | PTP `worker-api`                                                              |
| 3020        | AM `content-worker`                                                           |
| **3030**    | **CC `chunky-crayon-worker`**                                                 |
| 3040        | EZ `ezeikel-worker`                                                           |
| **3050**    | **GU `go-unbeaten-worker`**                                                   |
| **3060**    | **O35 `outside-ir35-jobs-worker`**                                            |
| 30000–50000 | Chrome debug ports spawned by PTP's Playwright workers (do not allocate here) |

**When adding a new project: pick the next available 10-slot in the 30xx range** (3030, 3040, 3050, ...). Leave gaps between projects for future sub-services.

### Systemd unit naming

- **One primary unit per project** named after the project role, not the company.
- `content-worker.service` (AM) and `worker-api.service` (PTP) are the current pattern.
- If a project needs multiple services (like PTP's `worker-api` + `worker-watchdog`), prefix them with the project's role and separate with `-`.
- Unit files live in `/etc/systemd/system/` as root-owned files.
- **Do NOT** use the user-scoped `~/.config/systemd/user/` — all services are system-level under root.

### Systemd unit template

Every project's primary service should look like this. Fill in the ALL_CAPS placeholders:

```ini
[Unit]
Description=PROJECT_NAME Worker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/REPO_NAME/PATH_TO_WORKER_DIR
EnvironmentFile=/opt/REPO_NAME/PATH_TO_WORKER_DIR/.env
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**If the project needs a display server (Playwright, etc):** wrap `ExecStart` in `xvfb-run` like PTP does:

```ini
ExecStart=/usr/bin/xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" /root/.bun/bin/bun run src/index.ts
```

### `.env` files

- **One `.env` file per project**, living inside the project's worker directory (not at `/opt/<name>/.env` at the root).
- For a monorepo project like AM where the worker is at `apps/content-worker/`, the env file lives at `/opt/auntie-marlenes/apps/content-worker/.env`.
- For a single-package project like PTP, the env file lives at `/opt/worker/.env`.
- The systemd unit must reference it via `EnvironmentFile=/absolute/path/to/.env`. Bun's built-in `.env` autoload is NOT used by the systemd service — the unit file explicitly loads env vars so they're available at process start.
- **Populate `.env` manually after git cloning** — it's gitignored. Copy values from your local `.env` via `scp` or paste over SSH.
- Env files are **never touched by the deploy workflow**. A deploy won't overwrite them; you have to SSH and edit them by hand when adding or rotating keys.

### HTTP server conventions

Every worker must:

1. **Bind to `0.0.0.0` (or `*`) on its assigned port**, not `127.0.0.1`, so Vercel cron endpoints can reach it over the public IP
2. **Expose a `GET /health` endpoint** returning JSON `{"status":"ok","service":"<name>"}` with a 200. The deploy workflow's health check curls `http://localhost:<port>/health` and expects a 200.
3. **Authenticate sensitive endpoints** with a `WORKER_SECRET` env var (or similar). The `/health` endpoint should be unauthenticated but lightweight.
4. **Log to stdout/stderr** — systemd pipes these to `journalctl -u <service>` automatically. Don't write app logs to files; use journald.

---

## Deploy workflow pattern

Each project deploys via a GitHub Actions workflow that SSHes into the box and runs a shell script. The pattern is identical across projects; copy-paste from an existing one when bootstrapping a new project.

**Canonical workflow file location in each repo:** `.github/workflows/deploy-<worker-name>.yml`

**Minimum structure:**

```yaml
name: Deploy <Worker Name>

on:
  push:
    branches: [main]
    paths:
      - "<path-to-worker-code>/**"
      - ".github/workflows/deploy-<worker-name>.yml"
  workflow_dispatch:
    inputs:
      action:
        description: "What to do"
        required: true
        default: "deploy-and-restart"
        type: choice
        options:
          - deploy-and-restart
          - deploy-only
          - restart-only

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Execute on Hetzner
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            set -e
            ACTION="${{ inputs.action || 'deploy-and-restart' }}"
            cd /opt/<REPO_NAME>

            if [[ "$ACTION" == deploy* ]]; then
              echo "Pulling latest code..."
              git checkout -- . || true
              git clean -fd <PATH_TO_WORKER_DIR>/ || true
              git pull origin main
              echo "Code pulled"

              echo "Installing dependencies..."
              cd <PATH_TO_WORKER_DIR>
              rm -rf node_modules
              ~/.bun/bin/bun install
              echo "Dependencies installed"
              cd /opt/<REPO_NAME>
            fi

            if [[ "$ACTION" != deploy-only ]]; then
              echo "Restarting <SERVICE_NAME> service..."
              systemctl restart <SERVICE_NAME>
              echo "Service restarted"
            fi

            sleep 3
            echo ""
            echo "=== Service Status ==="
            systemctl status <SERVICE_NAME> --no-pager -l || true
            echo ""
            echo "=== Recent Logs ==="
            journalctl -u <SERVICE_NAME> --no-pager -n 30 || true
            echo ""
            echo "=== Health Check ==="
            curl -s http://localhost:<PORT>/health || echo "Health check failed"
```

**Key points:**

- `paths:` filter means the workflow only runs when worker-relevant files change. Don't skip this — every PR would otherwise trigger a SSH deploy.
- `workflow_dispatch` with the three action options (`deploy-and-restart`, `deploy-only`, `restart-only`) is optional but very useful for debugging without needing a code change.
- `git clean -fd <PATH_TO_WORKER_DIR>/` scoped to the worker's subdirectory only — prevents blowing away `.env` files or other local-only state elsewhere in the monorepo.
- `rm -rf node_modules && bun install` is a clean install every deploy. Yes it's wasteful on a tight box, but it eliminates a whole class of "stale deps" bugs. If disk pressure becomes a problem, switch to `bun install --ci` or similar.

---

## Adding a new project to the box — full runbook

This is the playbook for the next time you want to host a third, fourth, Nth project on this box.

### 1. Pick a port

Pick the next 10-slot in the 30xx range that's not already allocated. See [Port allocation](#port-allocation) above. Update that table in this file before proceeding.

### 2. Provision the box directory

SSH into the box:

```bash
ssh root@157.90.168.197
```

Clone the repo:

```bash
cd /opt
git clone git@github.com:<org>/<repo>.git <repo-name>
cd <repo-name>
```

Install dependencies for the worker subdirectory:

```bash
cd <path-to-worker-dir>
~/.bun/bin/bun install
```

### 3. Create the `.env` file

```bash
vim <path-to-worker-dir>/.env
# Paste all required env vars — API keys, DB URLs, R2 creds, etc
# Do not commit this file; it's gitignored
chmod 600 .env  # restrict to root
```

### 4. Create the systemd unit

```bash
vim /etc/systemd/system/<worker-name>.service
```

Paste the [systemd unit template](#systemd-unit-template), fill in the placeholders, save.

### 5. Enable and start

```bash
systemctl daemon-reload
systemctl enable <worker-name>
systemctl start <worker-name>
systemctl status <worker-name>  # verify it's active
curl http://localhost:<PORT>/health  # verify it's responding
```

### 6. Set GitHub secrets on the new repo

From your laptop, with the `gh` CLI logged in:

```bash
printf '157.90.168.197' | gh secret set HETZNER_HOST --repo <org>/<repo>
printf 'root' | gh secret set HETZNER_USER --repo <org>/<repo>
gh secret set HETZNER_SSH_KEY --repo <org>/<repo> < ~/.ssh/id_ed25519
```

Verify:

```bash
gh secret list --repo <org>/<repo>
```

### 7. Add the deploy workflow

Create `.github/workflows/deploy-<worker-name>.yml` in the repo, using the [deploy workflow pattern](#deploy-workflow-pattern) as a template. Commit and push to `main`.

### 8. Trigger the first deploy

```bash
gh workflow run deploy-<worker-name>.yml --repo <org>/<repo>
sleep 5
gh run list --workflow=deploy-<worker-name>.yml --repo <org>/<repo> --limit 1
```

Watch the run logs. Expected: green checkmarks on all steps, `{"status":"ok","service":"<name>"}` from the health check.

### 9. Update this file

Add the new project to the [Current inhabitants](#current-inhabitants) table and the [Port allocation](#port-allocation) table. Commit that edit to all repos using this shared runbook.

---

## Common operations

### Check service status

```bash
ssh root@157.90.168.197 'systemctl status content-worker worker-api worker-watchdog --no-pager'
```

### Tail logs

```bash
ssh root@157.90.168.197 'journalctl -u content-worker -f'
# or for PTP:
ssh root@157.90.168.197 'journalctl -u worker-api -f'
```

### Manual restart

```bash
ssh root@157.90.168.197 'systemctl restart content-worker'
```

### Trigger a deploy without a code push

```bash
gh workflow run deploy-content-worker.yml --repo ezeikel/auntie-marlenes
# Optionally with a specific action:
gh workflow run deploy-content-worker.yml --repo ezeikel/auntie-marlenes --field action=restart-only
```

### Rollback to a previous commit

1. SSH in: `ssh root@157.90.168.197`
2. `cd /opt/<project>`
3. `git log --oneline -20` to find the commit you want
4. `git checkout <sha>` (detached HEAD)
5. `cd <worker-dir> && rm -rf node_modules && ~/.bun/bin/bun install`
6. `systemctl restart <service>`
7. Verify health
8. **When ready to forward again**, push a new commit to main OR `git checkout main && git pull` on the box manually, then run the deploy workflow

No rollback scripting is automated because rollbacks are rare and context-dependent — don't want to make them _easier_ than they should be.

### Check disk and memory

```bash
ssh root@157.90.168.197 'df -h /; free -h; du -sh /opt/*'
```

---

## Capacity

The box is a Hetzner CX23 (2 vCPU, 4 GB RAM, 75 GB disk, €3.49/month).

**Current headroom:**

- **Disk**: 52 GB free of 75 GB (69% free) — comfortable, could host 5+ more projects if they each match AM's ~800 MB footprint
- **Memory**: ~1.2 GB free of 4 GB at idle — **tight**. PTP worker spikes Chrome/Playwright memory aggressively under scrape load. A third project with >500 MB steady-state footprint would push into swap.
- **CPU**: Usually idle. Scrapes + video generation are bursty.

**When to upgrade the box:**

- Memory pressure causing OOM kills in journald
- Adding a project that needs Playwright/Chrome and will run concurrently with PTP's scrape
- Hosting any ML model or LLM serving workload

**How to upgrade:** Hetzner Cloud console → CX23 → Rescale → CX32 (8 GB RAM, €5.83/month) or CX42 (16 GB RAM, €10/month). Zero downtime in theory; do it during a quiet window anyway.

---

## Known gotchas

Things we learned the hard way, documented so nobody relearns them:

1. **Missing GitHub secrets cause the deploy workflow to fail silently with `Error: missing server host`.** The SSH action exits immediately with a confusing error if any of `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY` is unset. The AM deploy workflow was broken like this from April 4 until April 5 because secrets were never set. Verify all three secrets exist on every new repo before pushing.

2. **`git clean -fd` scoping matters.** PTP's early workflow had `git clean -fd` (unscoped) which would wipe untracked files anywhere in the repo, including locally-written `.env` files. Always scope it to the worker subdirectory path.

3. **`PORT` env var.** The AM content-worker defaults to port 3020 via `process.env.PORT || '3020'`. **The `.env` file must set `PORT` explicitly** or the service will bind to whatever the default is at the time of deploy, which may drift from what's documented here. Always set `PORT` explicitly in every project's `.env`.

4. **Bun install vs pnpm install.** Bun is used on the box because it's faster and has fewer quirks for bare Node-style TypeScript projects. **Your monorepo might use pnpm locally**, but deploys install via bun. This means any package that breaks under bun's module resolution will fail at deploy time. Test locally with `bun install && bun run src/index.ts` before relying on a deploy.

5. **Single SSH key for all projects.** Currently all deploying repos use the same `HETZNER_SSH_KEY`, which is Ezeikel's primary ed25519 key. If that key is ever rotated or revoked, every deploying repo breaks simultaneously. See [Rotating the SSH key](#rotating-the-ssh-key).

6. **No secrets manager.** Env files live on the box as plaintext at `/opt/<project>/<path>/.env` owned by root. This is fine for a solo maintainer but would need to become Doppler/1Password/Vault-backed before sharing access with anyone else.

7. **`root` ownership for everything.** All processes run as root because the box was initially set up as a single-user single-project scraper. Multi-project shared boxes should eventually migrate to per-project users (`ptp-deploy`, `marlene-deploy`, etc) with their own directories and systemd units running as those users. **Not done yet.** Tech debt.

8. **PTP's `worker-api.service` is dual-purpose.** The single process serves both the scrapers AND the AI automation API (`/automation/generate`, `/automation/challenge`, etc. — see the [Current inhabitants](#current-inhabitants) table). **A restart of `worker-api.service` drops BOTH the scrape queue and the AI API's in-flight requests.** Be careful when deploying PTP during peak hours for either workload. If you need to restart just one role's worker sub-process without taking down the HTTP server, use the `/restart` endpoint (scraper only) rather than `systemctl restart`.

9. **Two PTP repos, one worker directory.** `/opt/worker/` is `ezeikel/parking-ticket-pal-worker` — the worker repo with the Hono server, scrapers, and automation API. `/opt/parking-ticket-pal/` is `ezeikel/parking-ticket-pal` — the monorepo with the web/mobile app. They sound similar but are completely different repos serving completely different purposes. **Only `/opt/worker/` runs on the box**; the monorepo clone is stale. Don't confuse them when debugging.

---

## Changelog

- **2026-04-05** — Runbook written after auditing the box and setting up AM's `content-worker` service alongside PTP's existing `worker-api` + `worker-watchdog`. AM deploy workflow verified end-to-end via run `24008827959`, box advanced from commit `e0f5a7f` to `80290b6`.
- **2026-04-04** — AM's `/opt/auntie-marlenes` directory provisioned manually, `content-worker.service` systemd unit created, service started. `.github/workflows/deploy-content-worker.yml` added to the AM repo but never worked due to missing GitHub secrets.
- **2026-03-xx** — PTP's `worker-api` service migrated to use `xvfb-run` for headless browser automation.
- **2026-01-25** — Box originally provisioned as "parking-ticket-scraper" single-purpose host. Hostname still reflects this.

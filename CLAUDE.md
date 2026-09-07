# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ServerProjextX ("JewelChat") — a Node.js/Express REST API backing a mobile game/chat app. MySQL via
Knex.js, JWT auth via Passport, AWS + Firebase integrations, plus a small `/mongooseim` sub-API used
by an ejabberd/MongooseIM XMPP server for auth callbacks and push notifications.

## Commands

```bash
npm start                    # node ./bin/www — starts the server (PORT env var, default 3000)

# Knex (config auto-discovered from root knexfile.js, which re-exports
# knexfile_development.js / knexfile_production.js based on NODE_ENV)
npx knex migrate:latest      # run migrations
npx knex migrate:rollback    # roll back last migration batch
npx knex seed:run            # run all seeds in db/seeds/development
npx knex seed:run --specific=shows_seed.js   # run a single seed file

# Docker (see README.md for the full walkthrough)
docker compose up -d --build   # build + start, restart: unless-stopped
docker compose logs -f app     # tail logs (console.log/console.error go straight to this stream)
docker compose down            # stop + remove (deliberate; won't auto-restart after this)
```

There is no test suite, linter, or build step configured in this repo (no `test`/`lint`/`build`
script in `package.json`).

There are three knexfiles, and this split matters:
- `knexfile.js` — gitignored, root-level, just re-exports the two below so the Knex CLI can find
  config without `--knexfile`. **Must exist locally** (create it, see `knexfile_development.js` /
  `knexfile_production.js`) — Knex CLI fails outright without it.
- `knexfile_development.js` — gitignored, local dev credentials.
- `knexfile_production.js` — tracked in git, reads `durl`/`dusername`/`dpassword` from env vars
  (see `.env.example`). This is what the Docker image uses (`NODE_ENV=production` always).

## Architecture

**Request flow**: `bin/www` (HTTP server, signal handling) → `app.js` (Express app, middleware,
Passport JWT strategy setup, error handler) → `routes/index.js` (main API, all JWT-protected except
registration/health endpoints) + `routes/mongooseim.js` (XMPP integration, unauthenticated —
called server-to-server by MongooseIM) → `controllers/*.js` (one file per domain, all pulled
together through `controllers/index.js`) → `db/knex.js` (single shared Knex instance) → MySQL.

**Auth model**: `POST /registerPhoneNumber` → OTP via speakeasy → `POST /verifyCode` /
`POST /getAccessToken` issues a JWT (`utils/config.js` holds the hardcoded signing secret) → all
subsequent endpoints go through `passport.authenticate('jwt')`, verified in `utils/passport.js`
(`verifyPayload` trusts the JWT payload as-is, no DB lookup — session-free, stateless).

**Controllers are domain modules, not classes** — each `controllers/*.js` exports an object of
route-handler functions and talks directly to `db/knex.js` (no repository/service layer). Domains:
`registration` (signup/OTP/AWS Cognito token), `contacts` (profile, leaderboard, invites),
`game`/`factory`/`market`/`wallet` (core gameplay economy), `tasksgame`/`tasksgift`/`achievements`
(quest systems), `mongooseim` (XMPP password-check/push-notification callbacks).

**Database schema** lives entirely in `db/migrations/20170423002553_setup.js` (single migration,
~23 tables: `jcusers`, `jewels`, `jeweltype`, `scores`, `tasks`/`taskdetails`/`taskusers`,
`gifttasks`/`gifttaskdetails`/`gifttaskusers`, `achievements`/`achievementusers`,
`factory`/`factorymaterial`/`factoryuser`/`factorylogs`, `wallet`/`walletlog`, `market`,
`diamondlog`/`coinlog`/`pointlog`, `allgifts`, `invite`). Seed data lives in
`db/seeds/development/shows_seed*.js` — these use Bluebird `Promise.all()`, which requires an
**array** argument; passing bare comma-separated promises silently fails at runtime.

**Config/env pattern**: `utils/config.js` mutates `module.exports` in place (`config.x = process.env.x
|| default`) rather than returning a plain object — every module that does
`require('../utils/config')` shares the same live object. All external service credentials (AWS,
Firebase service account, MySQL) come from environment variables — see `.env.example` for the
full documented list. `.env` itself is gitignored; never hardcode secrets into tracked files
(`knexfile_production.js` is the pattern to follow — it reads from `process.env`).

**Process lifecycle**: `bin/www` calls `process.exit(99)` on any `uncaughtException` — this is
intentional, paired with Docker's `restart: unless-stopped` policy to self-heal crashed containers.
It only handles `SIGINT`, not `SIGTERM`, so `docker stop`/`docker compose down` will wait out the
full grace period before force-killing.

# RUANGKITA 2.0

**Your Township, Your Community.** Discover spaces. Create moments. Connect communities.

A responsive township engagement prototype for the Sime Darby Property University Hackathon 2026. Residents explore source-backed facilities, propose sample activities, register, and earn RuangPoints after organizer-verified demo attendance. Administrators review proposals and see statistics derived from the shared database.

This is an independent hackathon demonstration. It has no official partnership, venue-booking integration, payment collection, sponsorship commitment or redeemable rewards.

## Run locally

Use **Node.js 24 or later**. SQLite support is provided by Node itself; a separate database service is unnecessary.

```sh
npm ci
npm run dev
```

The development frontend uses Vite on port **5173** and proxies `/api` to Express on port **3001**. Open the frontend using your development host's access method. No credentials are required for the prepared demo identities.

For a single-server build:

```sh
npm run build
npm start
```

Express serves both the built frontend and API on port **3001**, or the `PORT` supplied by the host. Build before starting this mode. `GET /api/health` checks that the API is responding; demonstrate an actual registration journey to validate behavior.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exact lockfile dependencies. |
| `npm run dev` | Start the API watcher and Vite together. |
| `npm run build` | Check TypeScript and create `dist/`. |
| `npm test` | Run backend integration tests against isolated SQLite fixtures. |
| `npm run test:e2e` | Run the Playwright browser suite with its configured Chromium installation. |
| `npm start` | Serve the built app and API. |

Browser tests require Chromium. Use the system Chromium supported by the Playwright configuration, or install the configured browser with Playwright before running them. Test fixtures must not use your demo database.

## Demonstration access and security scope

Choose **Maya** or **Daniel** for resident journeys, **Aina** for the seeded organizer, and **Township team** for the platform administrator. Residents can also organize their own proposals. There are no email/password accounts and no passwords are stored.

The API issues random, HttpOnly, SameSite session cookies and checks role, township scope, activity ownership, registration uniqueness and capacity on the server. Individual registrations and points are scoped to the signed-in profile or an authorized event manager.

**The identity selector is intentionally public, including its administrator identity.** These controls demonstrate authorization after selecting an identity; they do not verify who a visitor really is. Do not enter real resident information or deploy this as a production resident system. Supabase Auth or another managed identity provider, verified role provisioning and a production authorization review are future work, not implemented integrations.

## Persistence and configuration

The shared SQLite database defaults to `.data/ruangkita.sqlite`. It is created and seeded on first startup. Browser refreshes and server restarts retain records while this file remains available. Catalog facts are synchronized from `data/catalog.json` on startup; demo records are not reseeded over an existing database.

`.env.example` describes deployment settings. The backend reads process environment variables; copying this file alone does not load them. Export variables in your shell or host settings, or start Node with `--env-file=.env`.

| Variable | Use |
| --- | --- |
| `PORT` | HTTP listening port; default `3001`. |
| `DATABASE_PATH` | SQLite file path; use persistent storage when hosted. |
| `NODE_ENV` | Set `production` on a hosted build. |
| `DEMO_ACCESS` | Must be `true` to explicitly enable this public demo in production mode. |
| `SECURE_COOKIES` | Set `true` when served behind HTTPS. |
| `APP_ORIGIN` | Optional comma-separated permitted application origins for the mutation origin checks. |

Never commit `.env` values, the generated database, session records or real personal data. To begin a separate clean rehearsal without deleting existing work, stop your server and start it with a different `DATABASE_PATH`.

## Implemented journey

1. Browse six townships and nine facilities with official source links and verification metadata.
2. Select a prepared identity and submit a five-step activity proposal.
3. Review as an administrator: approve, reject or request changes.
4. Separately confirm a **simulated** venue arrangement before registration opens.
5. Register as another resident; enforce capacity, duplicates and restricted-facility demo eligibility. Full activities use a waitlist.
6. Verify attendance as the activity owner, then complete the sample event.
7. View the resulting points ledger, participant records and administration metrics.

Community circles, proposal interest, profile editing, cancellation, waitlist promotion, sponsorship review and simulated exclusive-resource conflict checks support the main journey. See [the demo walkthrough](docs/DEMO.md).

Money is stored as integer **sen**. Participant cost estimates use the paying headcount; each registration retains its recorded illustrative contribution instead of silently changing previous amounts. The organizer is responsible for any shortfall under the prototype's funding policy. All amounts and funding statuses are simulations; the app sends no money and creates no real financial commitments.

RuangPoints use a transaction ledger and unique award keys: **20** for verified attendance, **10** for a first verified activity, **10** extra for a sustainability activity, and **30** for organizing and completing an activity. Joining alone gives no points. Cancellation uses reversal entries where applicable.

## Project structure

```text
src/                 React, TypeScript, routing and interface
server/app.mjs       Express API, authorization and transactions
server/index.mjs     HTTP process entry point
server/schema.sql    SQLite relational schema
data/catalog.json    Township and source-backed facility facts
public/              Local visual assets
tests/               Backend and browser checks
docs/SOURCES.md      Official sources and verification boundaries
docs/DEMO.md         Recording walkthrough and acceptance checklist
docs/DEPLOYMENT.md   Hosting and persistent storage instructions
```

## Data and limitations

Official source content was checked on **22 October 2026**. This establishes documented facility identities and amenities, not current opening conditions or booking rights. Cantara and Lyra are residential facilities. Unknown prices, operator identities and coordinates are not invented. Read [source evidence and refresh instructions](docs/SOURCES.md).

Demo identities, events, attendance, schedules, points and engagement metrics are fictional records. Metrics change with actual prototype actions; they are not evidence of real community impact. Attendance can be simulated before an event date for the presentation. Restricted-facility eligibility is a demo attestation and matching home township, not proof of residence or real access permission.

The application uses a single persistent Node/SQLite server. It is not a Supabase implementation and cannot be hosted as a static-only website. Production identity, real venue integrations, live payments, email delivery and reward redemption remain outside this prototype.

No public deployment or GitHub push is implied by these files. Follow [deployment instructions](docs/DEPLOYMENT.md), verify the resulting public site, and supply its real URL for submission. The submission deadline in the project brief is **23 October 2026, 11:59 PM Malaysia time**.

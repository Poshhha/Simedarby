# Deploying the RUANGKITA demo

This project needs a **Node.js 24+ server and persistent SQLite disk**. `npm run build` creates the frontend, and `npm start` serves it together with the Express API. A static-only Vercel or Netlify upload of `dist/` will not provide sessions, registrations or persistence.

No public deployment is created by these instructions. After deploying, test the real address before including it in a submission.

## Common host configuration

Use a host that supports a long-running Node service and a persistent writable volume, such as an appropriate Render, Railway or Fly.io service. Choose a plan with persistent storage; an ephemeral container filesystem will lose demo records when replaced.

| Setting | Value |
| --- | --- |
| Runtime | Node.js 24 or later |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Persistent mount | `/var/data` |
| `DATABASE_PATH` | `/var/data/ruangkita.sqlite` |
| `NODE_ENV` | `production` |
| `DEMO_ACCESS` | `true` |
| `SECURE_COOKIES` | `true` when the external site uses HTTPS |
| `APP_ORIGIN` | Your actual HTTPS application origin, if needed by the host/proxy route |
| `PORT` | Accept the host-provided value; otherwise default is `3001` |
| Health-check path | `/api/health` |

Use a **single application instance** with this local SQLite file. Do not independently scale instances with separate disks and expect shared records. The SQLite directory, including its write-ahead-log files, needs to remain on the mounted volume. Back up the database consistently before changing deployment/storage arrangements.

`DEMO_ACCESS=true` deliberately permits the public identity selector, including its administrator profile. Production mode refuses startup without that acknowledgement. This does not turn the demonstration into production authentication. Keep the “demo” labels and never collect real resident data.

## Render-style deployment

1. Make the repository available to your hosting account and create a Node web service using its project root.
2. Set Node 24+, the build command and the start command above.
3. Attach a persistent disk mounted at `/var/data` and set `DATABASE_PATH` accordingly.
4. Add the environment settings above through the host's secure settings interface. No Supabase or payment secret is required for this implementation.
5. Enable the host's HTTPS address and health check. Deploy one instance.
6. Run the functional smoke checks below before sharing its URL.

For Railway, configure the same service commands and attach a volume at `/var/data`. For Fly.io, use a Node 24 image with the built application, attach a volume at `/var/data`, route the internal service port to the app's `PORT`, and terminate external traffic through HTTPS. Consult the host's current documentation for its service/volume configuration; do not use an ephemeral preview service as permanent demo storage.

## Environment files

`.env.example` is documentation, not an automatically loaded backend configuration. Prefer host environment settings. For a local production rehearsal, you may prepare a private `.env` and invoke:

```sh
npm run build
node --env-file=.env server/index.mjs
```

For a local HTTP rehearsal, omit `SECURE_COOKIES=true`; browsers will not send a Secure cookie over ordinary HTTP. Use it on the real HTTPS deployment. Do not commit `.env`, the database or real credentials.

## Functional deployment smoke check

1. Confirm `/api/health` returns a successful JSON response.
2. Open the homepage and directly refresh an internal route to check SPA serving.
3. Choose a resident identity and create a clearly named test proposal.
4. Review it as Township team, then separately confirm a non-conflicting simulated venue slot.
5. Register another prepared resident; refresh and confirm the count and registration reference remain.
6. Verify attendance as the activity owner; confirm points appear once and administrator metrics update.
7. Restart/redeploy the service without replacing its persistent volume. Confirm the same test proposal and registration remain.
8. Check the interface on a phone-sized viewport and record the actual deployed URL.

A successful build, live process or health endpoint alone does not validate the end-to-end workflow. See [the walkthrough and acceptance checklist](DEMO.md).

## Moving beyond the hackathon

Before real adoption, replace public demo identity selection with managed authentication and verified role assignment. Supabase Auth/PostgreSQL is a possible future architecture; it is **not** wired into this code. Add audited production authorization, privacy controls and operational backups; verify venue permissions and current facility access with operators. Live payments, actual sponsorship approval and reward redemption require separate implemented and tested integrations.

Official-source domain `www.simedarbyproperty.com` is needed to refresh source evidence. The app does not claim a live connection to that operator or its booking systems. Source facts and their verification limits are recorded in [SOURCES.md](SOURCES.md).

## Included deployment files

`render.yaml` defines a single Render Node service with a 1 GB persistent disk and health check. Review its paid-service pricing in Render before creating the service; the file itself does not provision anything. Connect the repository and create a Blueprint from that file, or use the manual configuration above. Set `APP_ORIGIN` to the actual HTTPS origin if your reverse proxy changes the Host header.

`Dockerfile` builds the frontend and runs the API as a non-root user. A Docker-capable host can use:

```sh
docker build -t ruangkita-demo .
docker volume create ruangkita-data
docker run --rm -p 3001:3001 -e DEMO_ACCESS=true \
  -v ruangkita-data:/app/.data ruangkita-demo
```

For an HTTPS reverse proxy, also provide `SECURE_COOKIES=true` and the actual `APP_ORIGIN`. The application was validated directly with Node and in the Docker container, including a persisted SQLite write across container restart. Run the deployment smoke check against your actual host before sharing its public address.


If your build host uses a corporate or platform proxy, forward its standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` build arguments. The Dockerfile accepts an optional `extra_ca` BuildKit secret for an existing trusted CA certificate. Ensure the proxy hostname resolves inside BuildKit; an explicit `--add-host` mapping to that existing proxy may be necessary. Do not disable TLS or checksum verification. Neither proxy credentials nor the temporary CA mount are embedded in the image.

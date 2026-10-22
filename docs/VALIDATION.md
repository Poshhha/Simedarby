# Validation record

Validated in the cloud workspace on 22 October 2026 with Node.js 24.19.0.

- Frozen installation: `npm ci` succeeded using `package-lock.json`.
- Production build: `npm run build` passed TypeScript and Vite compilation.
- Backend: `npm test` passed all 10 integration tests; no skipped tests. These exercise the full journey, authorization and privacy, eligibility, capacity and waitlist promotion, stable integer-sen estimates, exclusive simulated schedule conflicts, proposal changes and sponsorship, reward idempotency/reversal, circles/interest, and database/session persistence across restart.
- Browser: `npm run test:e2e` passed both tests after the final modal and contrast updates. Three independent cookie sessions completed proposal creation, review, separate simulated venue confirmation, resident registration, organizer verification/completion, and point-ledger checks. Joining gave zero points; verified first badminton attendance gave 30, and event completion gave the organizer 30. Reloads retained registrations and points. No browser page errors were recorded.
- Mobile: the browser suite passed navigation, township filtering, Lyra source metadata and absence of horizontal overflow at 390 × 844.
- Development startup: `npm run dev` started Vite and the API. Requests through the Vite proxy validated the frontend, health, a real demo cookie session, six townships and nine facilities, and logout.
- Official facility source pages were fetched and checked. See SOURCES.md for what this verification establishes and what remains unknown.

The Node single-server workflow and Docker packaging were validated. The Docker build used the existing environment proxy, an explicit proxy hostname mapping for BuildKit, and the trusted extra CA through a temporary BuildKit secret; TLS and package integrity checks stayed enabled. A file-ownership correction allows the runtime to run as the non-root `node` user even when the source checkout has restrictive file modes. Container checks passed health, an internal SPA route, demo login, a SQLite profile write, and retention of that write after container restart. The isolated smoke container and its test volume were removed; the workspace database was preserved.

No public hosting deployment, managed production authentication, real venue reservation, real payment, sponsorship commitment or reward redemption was tested or claimed. No new-task snapshot restoration has been independently tested. Review/save the cloud configuration draft and publish the prepared environment to make the saved snapshot available to later tasks.
